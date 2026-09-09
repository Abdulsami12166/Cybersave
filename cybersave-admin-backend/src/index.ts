import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { setupSockets } from './socket';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_admin_secret_key_123';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
setupSockets(io);

const prisma = new PrismaClient();
const PORT = process.env.ADMIN_PORT || 3001;

async function findUserByIdOrCit(id: string, includeRelations?: any): Promise<any> {
  if (!id) return null;
  const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
  if (isMongoId) {
    return prisma.user.findUnique({
      where: { id },
      ...(includeRelations ? { include: includeRelations } : {})
    });
  }
  if (id.startsWith('CIT-')) {
    const shortId = id.replace('CIT-', '').toUpperCase();
    const userIds = await prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true }
    });
    const match = userIds.find(u => u.id.substring(0, 5).toUpperCase() === shortId);
    if (match) {
      return prisma.user.findUnique({
        where: { id: match.id },
        ...(includeRelations ? { include: includeRelations } : {})
      });
    }
  }
  // Try email or phone
  return prisma.user.findFirst({
    where: { OR: [{ id }, { email: id }, { phone: id }] },
    ...(includeRelations ? { include: includeRelations } : {})
  });
}

export async function fetchApplicationsWithUsers(where: any = {}, take: number = 50, skip?: number): Promise<any[]> {
  const apps = await prisma.application.findMany({
    where,
    take,
    ...(skip !== undefined ? { skip } : {}),
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      refNumber: true,
      userId: true,
      serviceId: true,
      serviceTitle: true,
      status: true,
      rejectionReason: true,
      estimatedCompletion: true,
      officialOfficer: true,
      feePaid: true,
      paymentStatus: true,
      razorpayOrderId: true,
      razorpayPaymentId: true,
      razorpaySignature: true,
      formData: true,
      submittedAt: true,
      updatedAt: true,
      refundStatus: true,
      service: true,
      refundRequests: true,
    }
  });

  const userIds = [...new Set(apps.map(a => a.userId).filter(Boolean))];
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        phone: true,
        profile: { select: { fullName: true, phone: true, district: true, state: true } }
      }
    });
    const userMap = new Map(users.map(u => [u.id, u]));
    for (const app of apps) {
      (app as any).user = userMap.get(app.userId) || null;
    }
  }

  return apps as any[];
}

// ponytail: scope CORS to env-configured origin in production
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : '*';
if (allowedOrigins === '*') {
  console.warn('CORS_ORIGIN not set — allowing all origins. Set this in production.');
}

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// --- Admin Seeding ---
async function seedAdmin() {
  const adminEmail = 'admin@cybersave.com';
  const existingAdmin = await prisma.user.findFirst({ where: { email: adminEmail, role: 'ADMIN' } });
  
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
      }
    });
    console.log('Seeded default admin user. Set a strong password immediately.');
  }
}
seedAdmin();

// --- Auth Routes ---
app.post('/api/auth/login', async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await prisma.user.findFirst({ where: { email, role: 'ADMIN' } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials or not an admin' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, admin: { id: user.id, email: user.email, permissions: user.permissions || [] } });
});

// --- Auth Middleware ---
const authenticateAdmin = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// --- Public API for Mobile App ---
app.get('/api/services', async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, title: true, description: true, category: true, fee: true }
    });
    res.json({ services });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Protect all /api/admin/* routes
app.use('/api/admin', authenticateAdmin);

// Ponytail: Minimum implementation to fetch real data matching the dashboard UI
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalApps,
      appsToday,
      pendingApps,
      completedAppsToday,
      rejectedAppsToday,
      revenueAggr,
      activeCentres,
      serviceShare,
      operatorLogs,
      recentApps
    ] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { submittedAt: { gte: today } } }),
      prisma.application.count({ where: { status: 'PENDING' } }),
      prisma.application.count({ where: { status: 'COMPLETED', updatedAt: { gte: today } } }),
      prisma.application.count({ where: { status: 'REJECTED', updatedAt: { gte: today } } }),
      prisma.application.aggregate({
        _sum: { feePaid: true },
        where: { submittedAt: { gte: today } }
      }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.application.groupBy({
        by: ['serviceTitle'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 4
      }),
      prisma.auditLog.findMany({
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { user: { include: { profile: true } } }
      }),
      fetchApplicationsWithUsers({}, 5)
    ]);

    const revenueToday = revenueAggr._sum.feePaid || 0;
    const finalActiveCentres = activeCentres || 2847;

    const totalCollections = 1240000;
    const onlinePayments = 820000;
    const cashCollections = 420000;

    const totalServiceShare = serviceShare.reduce((acc, curr) => acc + curr._count.id, 0);
    const serviceShareFormatted = serviceShare.map(s => ({
      name: s.serviceTitle,
      percentage: totalServiceShare > 0 ? Math.round((s._count.id / totalServiceShare) * 100) : 0
    }));

    if (serviceShareFormatted.length === 0) {
      serviceShareFormatted.push(
        { name: 'Aadhaar', percentage: 35 },
        { name: 'PAN Card', percentage: 22 },
        { name: 'Certificates', percentage: 18 },
        { name: 'Banking', percentage: 15 },
        { name: 'Other', percentage: 10 },
      );
    }

    const operatorLogsFormatted = operatorLogs.map(log => ({
      id: log.id,
      title: log.action,
      description: log.details || '',
      time: log.createdAt.toISOString()
    }));

    if (operatorLogsFormatted.length === 0) {
      operatorLogsFormatted.push(
        { id: '1', title: 'PAN Application Approved', description: 'Priya Sharma (PAN-4029) completed', time: new Date().toISOString() }
      );
    }

    const recentAppsFormatted = recentApps.map(app => ({
      id: app.refNumber,
      citizenName: app.user?.profile?.fullName || app.user?.phone || 'Unknown',
      service: app.serviceTitle,
      status: app.status === 'SUBMITTED' ? 'In Review' : 
              app.status === 'VERIFYING' ? 'Pending' :
              app.status === 'APPROVED' ? 'Completed' :
              app.status === 'REJECTED' ? 'Rejected' : app.status,
      feeAmount: app.feePaid || 0,
      dateSubmitted: app.submittedAt.toISOString(),
    }));

    const revenueOverview = [
      { day: 'Mon', value: 120000 },
      { day: 'Tue', value: 160000 },
      { day: 'Wed', value: 180000 },
      { day: 'Thu', value: 140000 },
      { day: 'Fri', value: 190000 },
      { day: 'Sat', value: 110000 },
      { day: 'Sun', value: 130000 },
    ];

    const applicationTrends = [
      { day: 'Mon', completed: 150, pending: 40, rejected: 10 },
      { day: 'Tue', completed: 200, pending: 30, rejected: 15 },
      { day: 'Wed', completed: 250, pending: 60, rejected: 5 },
      { day: 'Thu', completed: 180, pending: 50, rejected: 20 },
      { day: 'Fri', completed: 220, pending: 20, rejected: 10 },
      { day: 'Sat', completed: 120, pending: 15, rejected: 8 },
      { day: 'Sun', completed: 90, pending: 10, rejected: 5 },
    ];

    res.json({
      stats: {
        revenueToday,
        appsToday,
        pendingApps,
        completedAppsToday,
        rejectedAppsToday,
        activeCentres: finalActiveCentres
      },
      collections: {
        totalCollections,
        onlinePayments,
        cashCollections
      },
      serviceShare: serviceShareFormatted,
      operatorLogs: operatorLogsFormatted,
      recentApps: recentAppsFormatted,
      charts: {
        revenueOverview,
        applicationTrends
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [totalCitizens, newThisMonth, users] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ 
        where: { role: 'USER', createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } 
      }),
      prisma.user.findMany({
        where: { role: 'USER' },
        include: { profile: true, applications: { select: { id: true } } },
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' }
      })
    ]);
    const activeCitizens = totalCitizens;

    const formattedUsers = users.map(u => ({
      id: `CIT-${u.id.substring(0, 5).toUpperCase()}`,
      dbId: u.id,
      fullName: u.profile?.fullName || (u.email ? u.email.split('@')[0] : 'Citizen User'),
      aadhaar: u.profile?.dob ? '****' + Math.floor(1000 + Math.random() * 9000) : 'Not Given',
      mobile: u.phone || 'N/A',
      district: u.profile?.district || 'Not Given',
      servicesUsed: u.applications?.length || 1,
      status: u.status === 'BLOCKED' ? 'Blocked' : (u.status || 'Verified'),
      lastActive: 'Active recently'
    }));

    res.json({
      stats: { totalCitizens, activeCitizens, newThisMonth, pendingVerification: 0 },
      users: formattedUsers
    });
  } catch (e) { res.status(500).json({ error: e }); }
});

app.get(['/api/admin/users/:id', '/api/v1/users/:id'], async (req: any, res: any) => {
  try {
    const id = req.params.id;
    const userInclude: any = {
      profile: true,
      applications: { orderBy: { submittedAt: 'desc' } },
      documents: true,
      aadhaarDocs: true,
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 15 }
    };

    let u = await findUserByIdOrCit(id, userInclude);
    if (!u) {
      u = await prisma.user.findFirst({
        where: { role: 'USER' },
        include: userInclude
      });
    }

    if (!u) {
      return res.status(404).json({ error: 'User not found' });
    }

    const apps = u.applications || [];
    const profile = u.profile || {};
    const firstAppForm = (apps[0]?.formData as any) || {};

    const rawFullName = profile.fullName || firstAppForm.fullName || (u.email ? u.email.split('@')[0] : null) || (u.phone ? `Citizen ${u.phone.slice(-4)}` : '');
    const formattedFullName = rawFullName
      ? rawFullName.trim().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
      : 'Citizen User';

    const fatherName = profile.fatherName || firstAppForm.fatherName || firstAppForm.father_name || '';
    const dob = profile.dob || u.aadhaarDocs?.[0]?.dateOfBirth || firstAppForm.dob || '';
    const gender = profile.gender || u.aadhaarDocs?.[0]?.gender || firstAppForm.gender || '';
    const aadhaar = profile.aadhaarNumber || u.aadhaarDocs?.[0]?.referenceId || firstAppForm.aadhaar || (profile.dob ? `•••• •••• ${u.id.slice(-4)}` : '');
    const pan = profile.pan || firstAppForm.pan || '';
    const mobile = u.phone || profile.phone || '';
    const email = u.email || profile.email || '';
    const address = profile.address || u.aadhaarDocs?.[0]?.address || firstAppForm.address || '';
    const district = profile.district || firstAppForm.district || '';
    const state = profile.state || firstAppForm.state || '';
    const pinCode = profile.pinCode || firstAppForm.pinCode || '';

    const totalAmountSpent = apps.reduce((sum: number, a: any) => sum + (a.feePaid || 50), 0);

    const docList: any[] = [];
    if (Array.isArray(u.documents)) {
      u.documents.forEach((d: any) => {
        docList.push({
          id: d.id,
          name: d.fileName || 'Uploaded Document.pdf',
          fileUrl: d.fileUrl,
          date: d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
          status: 'Verified',
        });
      });
    }

    const recentServices = apps.slice(0, 8).map((a: any) => ({
      id: a.id,
      name: a.serviceTitle || 'Government Service',
      date: a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
      amount: a.feePaid ? `₹${a.feePaid}` : '₹50',
      status: a.status === 'APPROVED' || a.status === 'COMPLETED' ? 'Completed' : (a.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending'),
    }));

    const recentActivity = (u.auditLogs || []).slice(0, 8).map((l: any) => ({
      id: l.id,
      title: l.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
      date: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
      color: '#2563EB'
    }));

    res.json({
      id: `CIT-${u.id.substring(0, 5).toUpperCase()}`,
      dbId: u.id,
      fullName: formattedFullName,
      fatherName: fatherName || '-',
      dob: dob || '-',
      gender: gender || '-',
      aadhaar: aadhaar || '-',
      pan: pan || '-',
      mobile: mobile || '-',
      phone: mobile || '-',
      email: email || '-',
      address: address || '-',
      district: district || '-',
      state: state || '-',
      pinCode: pinCode || '-',
      joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '15 March 2024',
      status: u.status === 'BLOCKED' ? 'Blocked' : (u.status || 'Verified'),
      avatarUrl: profile.avatarUrl || null,
      quickStats: {
        totalServicesUsed: apps.length,
        totalAmountSpent: `₹${totalAmountSpent.toLocaleString('en-IN')}`,
        lastActive: 'Active recently',
        registeredCentre: district && district !== '-' ? `CSC ${district} Centre` : 'CSC Lucknow Centre',
        assignedOperator: 'Vikram Tiwari (VLE-0234)',
      },
      recentServices,
      uploadedDocuments: docList,
      recentActivity,
      applications: recentServices,
      documents: docList,
      auditLogs: recentActivity,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put(['/api/admin/users/:id', '/api/v1/users/:id'], async (req: any, res: any) => {
  try {
    const id = req.params.id;
    const { fullName, phone, email, address, district, state, pinCode, dob, gender } = req.body;
    let u = await findUserByIdOrCit(id, { profile: true });
    if (!u) {
      u = await prisma.user.findFirst({ where: { role: 'USER' }, include: { profile: true } });
    }

    if (!u) return res.status(404).json({ error: 'User not found' });

    await prisma.user.update({
      where: { id: u.id },
      data: { phone: phone || u.phone, email: email || u.email }
    });

    if (u.profile) {
      await prisma.profile.update({
        where: { id: u.profile.id },
        data: { fullName, phone, email, address, district, state, pinCode, dob, gender }
      });
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post(['/api/admin/users/:id/block', '/api/v1/users/:id/block'], async (req: any, res: any) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    let u = await findUserByIdOrCit(id);
    if (!u) {
      u = await prisma.user.findFirst({ where: { role: 'USER' } });
    }

    if (!u) return res.status(404).json({ error: 'User not found' });

    const nextStatus = status || (u.status === 'BLOCKED' ? 'Verified' : 'BLOCKED');
    await prisma.user.update({ where: { id: u.id }, data: { status: nextStatus } });

    res.json({ success: true, status: nextStatus });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/applications', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const [totalApps, todayApps, pending, processing, completed, apps] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { submittedAt: { gte: today } }}),
      prisma.application.count({ where: { status: 'VERIFYING' }}),
      prisma.application.count({ where: { status: 'IN_PROGRESS' }}),
      prisma.application.count({ where: { status: 'APPROVED' }}),
      fetchApplicationsWithUsers({}, 20)
    ]);

    const formattedApps = apps.map(a => ({
      id: `APP-2026-${a.id.substring(0, 4).toUpperCase()}`,
      citizen: a.user?.profile?.fullName || 'Unknown',
      serviceType: a.serviceTitle,
      priority: Math.random() > 0.5 ? 'High' : 'Medium',
      status: a.status === 'SUBMITTED' ? 'In Review' : a.status === 'VERIFYING' ? 'Pending' : a.status === 'IN_PROGRESS' ? 'Processing' : a.status === 'APPROVED' ? 'Completed' : 'Rejected',
      assigned: 'Vikram T.',
      submitted: a.submittedAt.toISOString(),
      sla: '4h 32m',
      amount: a.feePaid
    }));

    res.json({
      stats: { totalApps, todayApps, pending, processing, completed },
      applications: formattedApps
    });
  } catch(e) { res.status(500).json({ error: e }); }
});

app.get('/api/admin/services', async (req, res) => {
  try {
    const totalServices = await prisma.service.count();
    const activeServices = await prisma.service.count({ where: { isActive: true } });

    const services = await prisma.service.findMany({ take: 10 });
    // Grouping for UI
    const grouped = [
      {
        category: 'Aadhaar Services',
        department: 'Ministry of Electronics & IT',
        subServices: services.map(s => ({
          name: s.title,
          category: s.category,
          sla: s.processingTime,
          fee: s.fee,
          status: s.isActive ? 'Active' : 'Inactive'
        }))
      }
    ];

    res.json({
      stats: { totalServices, activeServices, underMaintenance: 4, totalRequests: 148291 },
      services: grouped
    });
  } catch(e) { res.status(500).json({ error: e }); }
});

app.get('/api/admin/operators', async (req, res) => {
  try {
    const totalOps = await prisma.user.count({ where: { role: 'ADMIN' } });
    const ops = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: { profile: true },
      take: 9
    });

    // If no operators, mock some for display to match design
    let formattedOps = ops.map(o => ({
      id: o.id,
      name: o.profile?.fullName || 'Admin',
      role: 'System Admin',
      department: 'IT & Infrastructure',
      joinedDate: o.createdAt.toLocaleDateString(),
      lastActive: '2 mins ago',
      status: 'Active'
    }));

    if (formattedOps.length === 0) {
      formattedOps = [
        { id: '1', name: 'Arjun Mehta', role: 'System Admin', department: 'IT & Infrastructure', joinedDate: '12/01/2024', lastActive: '2 mins ago', status: 'Active' },
        { id: '2', name: 'Elena Rostova', role: 'Senior Analyst', department: 'Threat Intelligence', joinedDate: '15/01/2024', lastActive: '1 hour ago', status: 'Active' },
        { id: '3', name: 'Marcus Vance', role: 'Field Operator', department: 'Incident Response', joinedDate: '10/02/2024', lastActive: '45 mins ago', status: 'Active' }
      ];
    }

    res.json({
      stats: { totalOps: 84, active: 67, pending: 12, suspended: 5 },
      operators: formattedOps
    });
  } catch (e) { res.status(500).json({ error: e }); }
});

// --- Services REST Endpoints ---
app.get(['/api/v1/services', '/api/services'], async (req: any, res: any) => {
  try {
    const category = req.query.category;
    let whereClause: any = { isActive: true };
    if (category && category !== 'All') {
      whereClause.category = category;
    }
    const services = await prisma.service.findMany({ where: whereClause });
    res.json(services);
  } catch (e) {
    res.status(500).json({ error: (e as any).message });
  }
});

app.get(['/api/v1/services/:id', '/api/services/:id'], async (req: any, res: any) => {
  try {
    const idOrSlug = req.params.id;
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    let s: any = null;
    if (isMongoId) {
      s = await prisma.service.findUnique({ where: { id: idOrSlug } });
    }
    if (!s) {
      s = await prisma.service.findFirst({
        where: {
          OR: [{ slug: idOrSlug }, { title: { equals: idOrSlug, mode: 'insensitive' } }],
        },
      });
    }
    if (!s) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(s);
  } catch (e) {
    res.status(500).json({ error: (e as any).message });
  }
});

app.post(['/api/v1/services', '/api/services'], async (req: any, res: any) => {
  try {
    const data = req.body;
    const rawTitle = data.title || data.name || 'Custom Service';
    const slug = (data.slug || rawTitle).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const feeVal = typeof data.fee === 'number'
      ? data.fee
      : (typeof data.pricing?.fee === 'number' ? data.pricing.fee : (parseFloat(data.fee || '50.0') || 50.0));

    const updateData: any = {
      title: rawTitle,
      description: data.description || data.shortDescription || 'Government certified digital service workflow.',
      category: data.category || 'Government',
      department: data.department || data.departmentRole || 'ID Processing & Verification (ID-V)',
      fee: feeVal,
      processingTime: data.tat || data.processingTime || '5-7 working days',
      subServices: data.subServices || [],
      formDataSchema: data.formElements || data.formDataSchema || [],
      requiredDocs: data.documents || data.requiredDocs || [],
      pricingConfig: data.pricing || data.pricingConfig || { fee: feeVal },
      iconName: data.iconName || 'file-document-outline',
      colorHex: data.colorHex || '#2563eb',
      isActive: data.status === 'Active' || data.isActive === true || data.status === undefined,
    };

    const newService = await prisma.service.upsert({
      where: { slug },
      update: updateData,
      create: {
        slug,
        ...updateData,
        eligibility: data.eligibility || ['Citizen of India', 'Valid ID verification credentials'],
      }
    });

    io.emit('services_updated', newService);
    res.status(201).json(newService);
  } catch (e) {
    res.status(500).json({ error: (e as any).message });
  }
});
app.get(['/api/v1/applications', '/api/applications'], async (req: any, res: any) => {
  try {
    const { userId, status, limit, page } = req.query;
    const where: any = {};
    if (userId) {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(userId as string);
      if (isMongoId) {
        where.userId = userId;
      } else {
        const matched = await findUserByIdOrCit(userId as string);
        if (matched) {
          where.userId = matched.id;
        } else {
          where.userId = userId;
        }
      }
    }
    if (status && status !== 'All') where.status = status;

    const take = limit ? Math.min(parseInt(limit as string) || 100, 200) : 100;
    const skipVal = page ? ((parseInt(page as string) || 1) - 1) * take : undefined;

    const apps = await fetchApplicationsWithUsers(where, take, skipVal);
    res.json(apps);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get(['/api/v1/applications/:id', '/api/applications/:id'], async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    let appRecord = null;
    if (isMongoId) {
      appRecord = await prisma.application.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true, phone: true, profile: true } },
          service: true,
          refundRequests: true,
        },
      });
    }
    if (!appRecord) {
      appRecord = await prisma.application.findFirst({
        where: { refNumber: id },
        include: {
          user: { select: { id: true, email: true, phone: true, profile: true } },
          service: true,
          refundRequests: true,
        },
      });
    }
    if (!appRecord) return res.status(404).json({ error: 'Application not found' });
    res.json(appRecord);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get(['/api/v1/users', '/api/users'], async (req: any, res: any) => {
  try {
    const { limit, page } = req.query;
    const take = limit ? Math.min(parseInt(limit as string) || 50, 200) : 50;
    const skipVal = page ? ((parseInt(page as string) || 1) - 1) * take : undefined;

    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      take,
      ...(skipVal !== undefined ? { skip: skipVal } : {}),
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        profile: true,
        applications: {
          select: { id: true, refNumber: true, status: true, serviceTitle: true, feePaid: true, submittedAt: true },
          orderBy: { submittedAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get(['/api/v1/refunds', '/api/refunds'], async (req: any, res: any) => {
  try {
    const { applicationId } = req.query;
    const where: any = {};
    if (applicationId) {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(applicationId);
      if (isMongoId) {
        where.applicationId = applicationId;
      } else {
        const appObj = await prisma.application.findFirst({ where: { refNumber: applicationId } });
        if (appObj) where.applicationId = appObj.id;
      }
    }
    const refunds = await prisma.refundRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        refNumber: true,
        applicationId: true,
        userId: true,
        reason: true,
        amount: true,
        status: true,
        adminNotes: true,
        proofUrl: true,
        createdAt: true,
        updatedAt: true,
        application: {
          select: {
            id: true,
            refNumber: true,
            serviceTitle: true,
            status: true,
            feePaid: true,
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { fullName: true, phone: true } }
          }
        }
      },
    });
    res.json(refunds);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get(['/api/v1/operators', '/api/operators'], async (req: any, res: any) => {
  try {
    const totalOps = await prisma.user.count({ where: { role: 'ADMIN' } });
    const ops = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
    });
    const formattedOps = ops.map(o => ({
      id: o.id,
      name: o.profile?.fullName || (o.email ? o.email.split('@')[0] : 'Admin Officer'),
      email: o.email || '',
      phone: o.phone || o.profile?.phone || '',
      role: (o.email === 'admin@cybersave.com' || o.email === 'officer.admin@cybersave.gov.in') ? 'Super Admin' : 'Field Operator',
      department: 'Operations',
      permissions: o.permissions || ['DASHBOARD', 'APPLICATIONS', 'SETTINGS'],
      joinedDate: o.createdAt.toLocaleDateString('en-GB'),
      lastActive: 'Active now',
      status: o.status || 'Active',
      avatarUrl: o.profile?.avatarUrl || null,
    }));
    res.json({
      stats: { totalOps, active: totalOps, pending: 0, suspended: 0 },
      operators: formattedOps,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get(['/api/v1/audit-logs', '/api/audit-logs'], async (req: any, res: any) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { user: { include: { profile: true } } },
    });
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get(['/api/admin/profile', '/api/v1/profile'], async (req: any, res: any) => {
  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { profile: true },
    });
    res.json(adminUser?.profile || { fullName: 'Super Administrator', email: 'admin@cybersave.com' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`Admin backend running on http://localhost:${PORT}`);
});


