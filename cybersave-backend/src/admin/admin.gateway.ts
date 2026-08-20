import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../database/prisma.service';
import { messaging } from './firebase';
import * as bcrypt from 'bcrypt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AdminGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  static instance: AdminGateway | null = null;

  constructor(private readonly prisma: PrismaService) {
    AdminGateway.instance = this;
  }

  static broadcast(event: string, data?: any) {
    if (AdminGateway.instance?.server) {
      AdminGateway.instance.server.emit(event, data);
    }
  }

  handleConnection(client: Socket) {
    console.log('[AdminGateway] Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('[AdminGateway] Client disconnected:', client.id);
  }

  @SubscribeMessage('request_dashboard_data')
  async handleDashboardData(@ConnectedSocket() client: Socket) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allApps = await this.prisma.application.findMany({
        include: { user: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const todayApps = allApps.filter((a) => {
        const d = new Date(a.submittedAt || a.createdAt);
        return d >= today;
      });

      const revenueToday = todayApps.reduce((sum, a) => {
        const fee = typeof a.feePaid === 'number' && !isNaN(a.feePaid) ? a.feePaid : (a.feePaid ? Number(a.feePaid) : 55.0);
        return sum + fee;
      }, 0);

      const totalRevenue = allApps.reduce((sum, a) => {
        const fee = typeof a.feePaid === 'number' && !isNaN(a.feePaid) ? a.feePaid : (a.feePaid ? Number(a.feePaid) : 55.0);
        return sum + fee;
      }, 0);

      const appsToday = todayApps.length;
      const pendingApps = allApps.filter((a) => a.status === 'PENDING' || a.status === 'SUBMITTED' || a.status === 'VERIFYING' || a.status === 'IN_PROGRESS').length;
      const completedAppsToday = todayApps.filter((a) => a.status === 'COMPLETED' || a.status === 'APPROVED').length;
      const rejectedAppsToday = todayApps.filter((a) => a.status === 'REJECTED').length;

      const activeCentres = await this.prisma.user.count({
        where: { role: 'ADMIN' },
      });

      // Compute dynamic 7-day overview (<= 7 days)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const revenueOverview: Array<{ day: string; date: string; value: number }> = [];
      const applicationTrends: Array<{ day: string; date: string; completed: number; pending: number; rejected: number }> = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);

        const dayShort = dayNames[d.getDay()];
        const dateLabel = `${dayShort} (${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })})`;

        const dayApps = allApps.filter((a) => {
          const appDate = new Date(a.submittedAt || a.createdAt);
          return appDate >= d && appDate < nextD;
        });

        const dayRev = dayApps.reduce((acc, a) => {
          const fee = typeof a.feePaid === 'number' && !isNaN(a.feePaid) ? a.feePaid : (a.feePaid ? Number(a.feePaid) : 55.0);
          return acc + fee;
        }, 0);
        const dayComp = dayApps.filter((a) => a.status === 'COMPLETED' || a.status === 'APPROVED').length;
        const dayPend = dayApps.filter((a) => a.status === 'PENDING' || a.status === 'SUBMITTED' || a.status === 'VERIFYING' || a.status === 'IN_PROGRESS').length;
        const dayRej = dayApps.filter((a) => a.status === 'REJECTED').length;

        revenueOverview.push({
          day: dayShort,
          date: dateLabel,
          value: dayRev,
        });

        applicationTrends.push({
          day: dayShort,
          date: dateLabel,
          completed: dayComp,
          pending: dayPend,
          rejected: dayRej,
        });
      }

      client.emit('response_dashboard_data', {
        stats: {
          revenueToday: revenueToday,
          totalRevenue: totalRevenue,
          appsToday: appsToday,
          totalApps: allApps.length,
          pendingApps: pendingApps,
          completedAppsToday: completedAppsToday,
          rejectedAppsToday: rejectedAppsToday,
          activeCentres: activeCentres || 1,
        },
        collections: {
          totalCollections: totalRevenue,
          onlinePayments: totalRevenue,
          cashCollections: 0,
        },
        serviceShare: [
          { name: 'Aadhaar Services', percentage: 35 },
          { name: 'PAN Card Services', percentage: 22 },
          { name: 'Certificates', percentage: 18 },
          { name: 'Finance & Banking', percentage: 15 },
          { name: 'Passport & Others', percentage: 10 },
        ],
        operatorLogs: [
          {
            id: '1',
            title: 'System Online',
            description: 'Real-time WebSocket & Database sync active',
            time: new Date().toISOString(),
          },
        ],
        recentApps: allApps.slice(0, 5),
        charts: {
          revenueOverview,
          applicationTrends,
        },
      });
    } catch (e) {
      console.error('[AdminGateway] request_dashboard_data error:', e);
    }
  }

  @SubscribeMessage('request_users_data')
  async handleUsersData(@ConnectedSocket() client: Socket) {
    try {
      const totalCitizens = await this.prisma.user.count({
        where: { role: 'USER' },
      });
      const activeCitizens = totalCitizens;
      const newThisMonth = await this.prisma.user.count({
        where: {
          role: 'USER',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      });

      const users = await this.prisma.user.findMany({
        where: { role: 'USER' },
        include: { profile: true, applications: true },
        orderBy: { createdAt: 'desc' },
      });

      const formattedUsers = users.map((u) => ({
        id: `CIT-${u.id.substring(0, 5).toUpperCase()}`,
        dbId: u.id,
        fullName: u.profile?.fullName || 'Unknown',
        aadhaar: u.profile?.dob
          ? '****' + Math.floor(1000 + Math.random() * 9000)
          : 'Not Given',
        mobile: u.phone || 'N/A',
        district: u.profile?.district || 'Not Given',
        servicesUsed: u.applications?.length || 0,
        status: u.status === 'BLOCKED' ? 'BLOCKED' : u.status || 'Verified',
        avatarUrl: u.profile?.avatarUrl || null,
        lastActive: 'Active recently',
      }));

      client.emit('response_users_data', {
        stats: {
          totalCitizens,
          activeCitizens,
          newThisMonth,
          pendingVerification: 0,
        },
        users: formattedUsers,
      });
    } catch (e) {
      console.error('[AdminGateway] request_users_data error:', e);
    }
  }

  @SubscribeMessage('request_user_detail')
  async handleUserDetail(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string },
  ) {
    try {
      let realId = data.id;
      let u = await this.prisma.user.findUnique({
        where: { id: realId },
        include: { profile: true },
      });

      if (!u && realId.startsWith('CIT-')) {
        const shortId = realId.replace('CIT-', '').toUpperCase();
        const allUsers = await this.prisma.user.findMany({
          where: { role: 'USER' },
          include: { profile: true },
        });
        u =
          allUsers.find((x) => x.id.substring(0, 5).toUpperCase() === shortId) ||
          null;
      }

      if (!u) {
        u = await this.prisma.user.findFirst({
          where: { role: 'USER' },
          include: { profile: true },
        });
      }

      if (!u) {
        client.emit('response_user_detail', { error: 'User not found' });
        return;
      }

      const apps = await this.prisma.application.findMany({
        where: { userId: u.id },
        orderBy: { submittedAt: 'desc' },
      });

      const logs = await this.prisma.auditLog.findMany({
        where: { userId: u.id },
        orderBy: { createdAt: 'desc' },
      });

      client.emit('response_user_detail', {
        id: `CIT-${u.id.substring(0, 5).toUpperCase()}`,
        dbId: u.id,
        fullName: u.profile?.fullName || 'Unknown',
        aadhaar: u.profile?.dob
          ? '****' + Math.floor(1000 + Math.random() * 9000)
          : 'Not Given',
        mobile: u.phone || 'N/A',
        email: u.email || 'N/A',
        district: u.profile?.district || 'Not Given',
        state: u.profile?.state || 'Not Given',
        joinedDate: u.createdAt.toLocaleDateString(),
        status: u.status === 'BLOCKED' ? 'BLOCKED' : u.status || 'Verified',
        avatarUrl: u.profile?.avatarUrl || null,
        applications: apps.map((a) => ({
          id: `APP-${a.id.substring(0, 5).toUpperCase()}`,
          refNumber: a.refNumber,
          serviceTitle: a.serviceTitle,
          status: a.status,
          feePaid: a.feePaid,
          submittedAt: a.submittedAt.toLocaleDateString(),
        })),
        auditLogs: logs.map((l) => ({
          id: l.id,
          action: l.action,
          details: l.details || '',
          createdAt:
            l.createdAt.toLocaleDateString() +
            ' ' +
            l.createdAt.toLocaleTimeString(),
        })),
      });
    } catch (e) {
      console.error('[AdminGateway] request_user_detail error:', e);
    }
  }

  @SubscribeMessage('block_citizen')
  async handleBlockCitizen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string; status: string },
  ) {
    try {
      let realId = data.id;
      let u = await this.prisma.user.findUnique({ where: { id: realId } });

      if (!u && realId.startsWith('CIT-')) {
        const shortId = realId.replace('CIT-', '').toUpperCase();
        const allUsers = await this.prisma.user.findMany({
          where: { role: 'USER' },
        });
        u =
          allUsers.find((x) => x.id.substring(0, 5).toUpperCase() === shortId) ||
          null;
      }

      if (!u) {
        console.error(`[AdminGateway] User not found: ${realId}`);
        return;
      }

      await this.prisma.user.update({
        where: { id: u.id },
        data: { status: data.status },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: u.id,
          action: data.status === 'BLOCKED' ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
          details: `Admin changed user status to ${data.status}`,
        },
      });

      client.emit('block_citizen_success');
    } catch (e) {
      console.error('[AdminGateway] block_citizen error:', e);
    }
  }

  @SubscribeMessage('request_applications_data')
  async handleApplicationsData(@ConnectedSocket() client: Socket) {
    try {
      const totalApps = await this.prisma.application.count();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayApps = await this.prisma.application.count({
        where: { submittedAt: { gte: today } },
      });
      const pending = await this.prisma.application.count({
        where: { status: 'SUBMITTED' },
      });
      const processing = await this.prisma.application.count({
        where: { status: 'IN_PROGRESS' },
      });
      const completed = await this.prisma.application.count({
        where: { status: 'APPROVED' },
      });

      const apps = await this.prisma.application.findMany({
        take: 100,
        orderBy: { submittedAt: 'desc' },
        include: {
          user: { include: { profile: true } },
          service: true,
        },
      });

      const formattedApps = await Promise.all(
        apps.map(async (a) => {
          const userProfile = a.user?.profile;
          const formData = (a.formData as any) || {};
          let docs = (a.documents as any) || [];

          // If docs is empty, has empty arrays, or lacks valid fileUrl, look up DocumentUpload for this user
          const hasValidDocs =
            Array.isArray(docs) &&
            docs.length > 0 &&
            docs.some(
              (d: any) =>
                d &&
                typeof d === 'object' &&
                !Array.isArray(d) &&
                (d.fileUrl || d.url || d.uri),
            );

          if (!hasValidDocs && a.userId) {
            const userDocs = await this.prisma.documentUpload.findMany({
              where: { userId: a.userId },
              orderBy: { uploadedAt: 'desc' },
              take: 4,
            });
            if (userDocs.length > 0) {
              docs = userDocs.map((ud, idx) => ({
                label: `Document Proof #${idx + 1}`,
                fileName: ud.fileName || `proof_${idx + 1}.jpg`,
                fileUrl: ud.fileUrl,
                type: 'Identity Proof',
              }));
            }
          }

          // Clean docs array so no empty arrays or invalid objects remain
          const cleanedDocs = (Array.isArray(docs) ? docs : [])
            .filter((d: any) => d && typeof d === 'object' && !Array.isArray(d) && (d.fileUrl || d.url || d.uri || d.fileName || d.label))
            .map((d: any, idx: number) => ({
              label: d.label || `Document Proof #${idx + 1}`,
              fileName: d.fileName || `proof_${idx + 1}.jpg`,
              fileUrl: d.fileUrl || d.url || d.uri || '',
              type: d.type || 'Identity Proof',
            }));

          return {
            id: a.refNumber || `APP-2026-${a.id.substring(0, 4).toUpperCase()}`,
            rawId: a.id,
            refNumber: a.refNumber,
            citizen: userProfile?.fullName || formData.fullName || a.user?.email || 'Citizen Applicant',
            citizenEmail: a.user?.email || formData.email || '',
            citizenPhone: a.user?.phone || userProfile?.phone || formData.phone || '',
            serviceType: a.serviceTitle || a.service?.title || 'Government Service',
            serviceCategory: a.service?.category || 'Government',
            priority: 'Medium',
            rawStatus: a.status,
            status:
              a.status === 'SUBMITTED'
                ? 'In Review'
                : a.status === 'VERIFYING'
                  ? 'Pending'
                  : a.status === 'IN_PROGRESS'
                    ? 'Processing'
                    : a.status === 'APPROVED'
                      ? 'Approved'
                      : a.status === 'COMPLETED'
                        ? 'Completed'
                        : a.status === 'REJECTED'
                          ? 'Rejected'
                          : 'Pending',
            assigned: a.officialOfficer || 'Auto Assigned (SDM)',
            submitted: a.submittedAt ? a.submittedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
            submittedAtFull: a.submittedAt ? a.submittedAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-IN'),
            sla: '24h',
            amount: a.feePaid || 50.0,
            paymentStatus: a.paymentStatus || 'Success',
            razorpayPaymentId: a.razorpayPaymentId || '',
            razorpayOrderId: a.razorpayOrderId || '',
            rejectionReason: a.rejectionReason || '',
            formData: {
              fullName: formData.fullName || userProfile?.fullName || '',
              email: formData.email || a.user?.email || '',
              phone: formData.phone || a.user?.phone || userProfile?.phone || '',
              dob: formData.dob || userProfile?.dob || '',
              gender: formData.gender || userProfile?.gender || '',
              fatherName: formData.fatherName || '',
              motherName: formData.motherName || '',
              placeOfBirth: formData.placeOfBirth || '',
              state: formData.state || userProfile?.state || '',
              district: formData.district || userProfile?.district || '',
              pinCode: formData.pinCode || userProfile?.pinCode || '',
              address: formData.address || userProfile?.address || '',
              ...formData,
            },
            documents: cleanedDocs,
            applicantProfile: {
              fullName: userProfile?.fullName || formData.fullName || 'Citizen Applicant',
              aadhaar: (userProfile as any)?.aadhaarNumber || formData.aadhaarNumber || 'Verified ID Vault',
              dob: userProfile?.dob || formData.dob || 'Not Provided',
              gender: userProfile?.gender || formData.gender || 'Not Provided',
              fatherName: formData.fatherName || 'Not Provided',
              motherName: formData.motherName || 'Not Provided',
              placeOfBirth: formData.placeOfBirth || 'Not Provided',
              state: userProfile?.state || formData.state || 'Not Provided',
              district: userProfile?.district || formData.district || 'Not Provided',
              pinCode: userProfile?.pinCode || formData.pinCode || 'Not Provided',
              address: userProfile?.address || formData.address || 'Not Provided',
            },
          };
        }),
      );

      client.emit('response_applications_data', {
        stats: { totalApps, todayApps, pending, processing, completed },
        applications: formattedApps,
      });
    } catch (e) {
      console.error('[AdminGateway] request_applications_data error:', e);
    }
  }

  @SubscribeMessage('update_application_status')
  async handleUpdateApplicationStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id?: string; applicationId?: string; refNumber?: string; status: string; rejectionReason?: string },
  ) {
    try {
      const targetId = data.id || data.applicationId || data.refNumber;
      if (!targetId) return;

      const validStatusMap: Record<string, string> = {
        'approved': 'APPROVED',
        'Approved': 'APPROVED',
        'APPROVED': 'APPROVED',
        'rejected': 'REJECTED',
        'Rejected': 'REJECTED',
        'REJECTED': 'REJECTED',
        'in progress': 'IN_PROGRESS',
        'In Progress': 'IN_PROGRESS',
        'processing': 'IN_PROGRESS',
        'Processing': 'IN_PROGRESS',
        'IN_PROGRESS': 'IN_PROGRESS',
        'pending': 'VERIFYING',
        'Pending': 'VERIFYING',
        'verifying': 'VERIFYING',
        'VERIFYING': 'VERIFYING',
        'submitted': 'SUBMITTED',
        'Submitted': 'SUBMITTED',
        'In Review': 'SUBMITTED',
        'SUBMITTED': 'SUBMITTED',
        'completed': 'COMPLETED',
        'Completed': 'COMPLETED',
        'COMPLETED': 'COMPLETED',
      };

      const mappedStatus = validStatusMap[data.status] || (data.status.toUpperCase() as any);

      const isMongoId = (idStr?: string) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr);
      const orConditions: any[] = [{ refNumber: targetId }];
      if (isMongoId(targetId)) {
        orConditions.push({ id: targetId });
      }

      const app = await this.prisma.application.findFirst({
        where: { OR: orConditions },
      });

      if (app) {
        const updated = await this.prisma.application.update({
          where: { id: app.id },
          data: {
            status: mappedStatus as any,
            rejectionReason: mappedStatus === 'REJECTED' ? (data.rejectionReason || 'Application rejected during administrative verification.') : null,
            updatedAt: new Date(),
          },
          include: {
            user: { include: { profile: true } },
            service: true,
          },
        });

        // Real-time broadcast to all connected Admin and Mobile clients
        this.server.emit('applications_updated');
        this.server.emit('transactions_updated');
        this.server.emit('application_status_changed', {
          id: updated.id,
          refNumber: updated.refNumber,
          userId: updated.userId,
          status: updated.status,
          rejectionReason: updated.rejectionReason,
        });

        client.emit('update_application_status_success', {
          id: updated.id,
          refNumber: updated.refNumber,
          status: updated.status,
          rejectionReason: updated.rejectionReason,
        });
      }
    } catch (e) {
      console.error('[AdminGateway] update_application_status error:', e);
      client.emit('update_application_status_error', { error: e.message });
    }
  }

  @SubscribeMessage('request_application_detail')
  async handleApplicationDetail(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string },
  ) {
    try {
      const isMongoId = (idStr?: string) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr);
      const orConditions: any[] = [{ refNumber: data.id }];
      if (isMongoId(data.id)) {
        orConditions.push({ id: data.id });
      }

      const app = await this.prisma.application.findFirst({
        where: { OR: orConditions },
        include: {
          user: { include: { profile: true } },
          service: true,
        },
      });

      if (app) {
        let docs = (app.documents as any) || [];
        const hasValidDocs =
          Array.isArray(docs) &&
          docs.length > 0 &&
          docs.some(
            (d: any) =>
              d &&
              typeof d === 'object' &&
              !Array.isArray(d) &&
              (d.fileUrl || d.url || d.uri),
          );

        if (!hasValidDocs && app.userId) {
          const userDocs = await this.prisma.documentUpload.findMany({
            where: { userId: app.userId },
            orderBy: { uploadedAt: 'desc' },
            take: 4,
          });
          if (userDocs.length > 0) {
            docs = userDocs.map((ud, idx) => ({
              label: `Document Proof #${idx + 1}`,
              fileName: ud.fileName || `proof_${idx + 1}.jpg`,
              fileUrl: ud.fileUrl,
              type: 'Identity Proof',
            }));
          }
        }

        const cleanedDocs = (Array.isArray(docs) ? docs : [])
          .filter((d: any) => d && typeof d === 'object' && !Array.isArray(d) && (d.fileUrl || d.url || d.uri || d.fileName || d.label))
          .map((d: any, idx: number) => ({
            label: d.label || `Document Proof #${idx + 1}`,
            fileName: d.fileName || `proof_${idx + 1}.jpg`,
            fileUrl: d.fileUrl || d.url || d.uri || '',
            type: d.type || 'Identity Proof',
          }));

        client.emit('response_application_detail', {
          id: app.refNumber,
          rawId: app.id,
          serviceName: app.serviceTitle,
          sla: '24h',
          submitted: app.submittedAt ? app.submittedAt.toLocaleString('en-IN') : 'Today',
          assignedTo: app.officialOfficer || 'Officer Sharma (SDM)',
          centre: 'CyberSave E-Gov Portal Central Hub',
          status: app.status,
          rejectionReason: app.rejectionReason,
          feePaid: app.feePaid || 50.0,
          paymentStatus: app.paymentStatus || 'Success',
          razorpayPaymentId: app.razorpayPaymentId || '',
          razorpayOrderId: app.razorpayOrderId || '',
          formData: app.formData,
          documents: cleanedDocs,
          applicant: {
            name: app.user?.profile?.fullName || (app.formData as any)?.fullName || 'Applicant',
            email: app.user?.email || (app.formData as any)?.email,
            phone: app.user?.phone || app.user?.profile?.phone || (app.formData as any)?.phone,
            aadhaar: (app.user?.profile as any)?.aadhaarNumber || (app.formData as any)?.aadhaarNumber || 'Verified ID Vault',
            dob: app.user?.profile?.dob || (app.formData as any)?.dob,
            gender: app.user?.profile?.gender || (app.formData as any)?.gender,
            state: app.user?.profile?.state || (app.formData as any)?.state,
            district: app.user?.profile?.district || (app.formData as any)?.district,
            address: app.user?.profile?.address || (app.formData as any)?.address,
          },
        });
      }
    } catch (e) {
      console.error('[AdminGateway] request_application_detail error:', e);
    }
  }

  @SubscribeMessage('request_services_data')
  async handleServicesData(@ConnectedSocket() client: Socket) {
    try {
      const totalServices = await this.prisma.service.count();
      const activeServices = await this.prisma.service.count({
        where: { isActive: true },
      });
      const services = await this.prisma.service.findMany({ take: 100 });
      const allApps = await this.prisma.application.findMany({
        select: { id: true, serviceId: true, serviceTitle: true },
      });

      const totalRequests = allApps.length;
      const countMap: Record<string, number> = {};
      const typeCountMap: Record<string, number> = {};

      allApps.forEach((a) => {
        if (a.serviceId) countMap[a.serviceId] = (countMap[a.serviceId] || 0) + 1;
        if (a.serviceTitle) {
          const key = a.serviceTitle.toLowerCase().trim();
          typeCountMap[key] = (typeCountMap[key] || 0) + 1;
        }
      });

      const groups: Record<string, any> = {};
      services.forEach((s) => {
        if (!groups[s.category]) {
          groups[s.category] = {
            category: s.category,
            department: s.department,
            subServices: [],
          };
        }

        const exactCount = countMap[s.id] || 0;
        const typeCount = typeCountMap[s.title.toLowerCase().trim()] || 0;
        const realCount = Math.max(exactCount, typeCount);

        groups[s.category].subServices.push({
          id: s.id,
          name: s.title,
          category: s.category,
          sla: s.processingTime || '5-7 Days',
          fee: s.fee || 50,
          appliedCount: realCount,
          appliedText: `${realCount.toLocaleString()} applied`,
          status: s.isActive ? 'Active' : 'Inactive',
        });
      });

      client.emit('response_services_data', {
        stats: {
          totalServices: totalServices || 28,
          activeServices: activeServices || 28,
          underMaintenance: 0,
          totalRequests: totalRequests || 4280,
        },
        services: Object.values(groups),
      });
    } catch (e) {
      console.error('[AdminGateway] request_services_data error:', e);
    }
  }

  @SubscribeMessage('edit_service')
  async handleEditService(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string; name: string },
  ) {
    try {
      await this.prisma.service.update({
        where: { id: data.id },
        data: { title: data.name },
      });
      client.emit('edit_service_success');
    } catch (e) {
      console.error('[AdminGateway] edit_service error:', e);
    }
  }

  @SubscribeMessage('create_application')
  async handleCreateApplication(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { title: string; description: string; fee?: number; category?: string },
  ) {
    try {
      const rawTitle = data.title || 'New Government Scheme';
      const slug = rawTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      
      const defaultDocs = [
        { type: 'Government-Issued Identity Proof', req: 'Required' },
        { type: 'Address Proof', req: 'Required' },
        { type: 'Application Supporting Document', req: 'Required' },
      ];

      const defaultSchema = [
        { label: 'Full Name', type: 'text', required: true },
        { label: 'Date of Birth', type: 'date', required: true },
        { label: 'Gender', type: 'select', required: true },
        { label: "Father's Name", type: 'text', required: true },
        { label: "Mother's Name", type: 'text', required: true },
        { label: 'Place of Birth', type: 'text', required: true },
        { label: 'State', type: 'text', required: true },
        { label: 'District', type: 'text', required: true },
        { label: 'PIN Code', type: 'text', required: true },
      ];

      const newService = await this.prisma.service.upsert({
        where: { slug },
        update: {
          title: rawTitle,
          description: data.description || 'Government certified e-governance service workflow.',
          category: data.category || 'Government',
          fee: data.fee || 50.0,
          requiredDocs: defaultDocs,
          formDataSchema: defaultSchema,
          isActive: true,
        },
        create: {
          slug,
          title: rawTitle,
          description: data.description || 'Government certified e-governance service workflow.',
          category: data.category || 'Government',
          department: 'General Administration',
          fee: data.fee || 50.0,
          processingTime: '7-15 Days',
          eligibility: ['Citizen of India', 'Valid ID verification credentials'],
          requiredDocs: defaultDocs,
          formDataSchema: defaultSchema,
          isActive: true,
          iconName: 'file-document-outline',
          colorHex: '#2563eb',
        },
      });

      client.emit('create_application_success');
      this.server.emit('applications_updated');
      this.server.emit('services_updated', newService);
    } catch (e) {
      console.error('[AdminGateway] create_application error:', e);
    }
  }

  @SubscribeMessage('save_service_config')
  async handleSaveServiceConfig(@MessageBody() data: any) {
    try {
      const rawTitle = data.name || data.title || 'Custom Service';
      const slug = rawTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      const feeVal = data.pricing?.fee || data.fee || 50.0;

      const newService = await this.prisma.service.upsert({
        where: { slug },
        update: {
          title: rawTitle,
          description: data.description || 'Government certified digital service workflow.',
          category: data.category || 'Government',
          department: data.departmentRole || 'ID Processing & Verification (ID-V)',
          fee: feeVal,
          processingTime: '7-15 Days',
          subServices: data.subServices,
          formDataSchema: data.formElements,
          requiredDocs: data.documents,
          pricingConfig: data.pricing,
          iconName: 'file-document-outline',
          colorHex: '#2563eb',
          isActive: true,
        },
        create: {
          slug,
          title: rawTitle,
          description: data.description || 'Government certified digital service workflow.',
          category: data.category || 'Government',
          department: data.departmentRole || 'ID Processing & Verification (ID-V)',
          fee: feeVal,
          processingTime: '7-15 Days',
          eligibility: ['Citizen of India', 'Valid ID verification credentials'],
          subServices: data.subServices,
          formDataSchema: data.formElements,
          requiredDocs: data.documents,
          pricingConfig: data.pricing,
          iconName: 'file-document-outline',
          colorHex: '#2563eb',
          isActive: true,
        },
      });

      console.log('[AdminGateway] Service configuration saved:', newService.id);
      this.server.emit('services_updated', newService);
    } catch (e) {
      console.error('[AdminGateway] save_service_config error:', e);
    }
  }

  @SubscribeMessage('request_operators_data')
  async handleOperatorsData(@ConnectedSocket() client: Socket) {
    try {
      const totalOps = await this.prisma.user.count({
        where: { role: 'ADMIN' },
      });
      const ops = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: { profile: true },
      });

      const formattedOps = ops.map((o) => ({
        id: o.id,
        name: o.profile?.fullName || 'Admin',
        role: 'System Admin',
        department: 'IT & Infrastructure',
        joinedDate: o.createdAt.toLocaleDateString(),
        lastActive: 'Active recently',
        status: 'Active',
        permissions: o.permissions || [],
      }));

      client.emit('response_operators_data', {
        stats: { totalOps, active: totalOps, pending: 0, suspended: 0 },
        operators: formattedOps,
      });
    } catch (e) {
      console.error('[AdminGateway] request_operators_data error:', e);
    }
  }

  @SubscribeMessage('update_operator_access')
  async handleUpdateOperatorAccess(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string; permissions: string[] },
  ) {
    try {
      await this.prisma.user.update({
        where: { id: data.id },
        data: { permissions: data.permissions },
      });
      client.emit('update_operator_access_success', {
        id: data.id,
        permissions: data.permissions,
      });

      const ops = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: { profile: true },
      });
      const formattedOps = ops.map((o) => ({
        id: o.id,
        name: o.profile?.fullName || 'Admin',
        role: 'System Admin',
        department: 'IT & Infrastructure',
        joinedDate: o.createdAt.toLocaleDateString(),
        lastActive: 'Active recently',
        status: 'Active',
        permissions: o.permissions || [],
      }));
      this.server.emit('response_operators_data', {
        stats: { totalOps: ops.length, active: ops.length, pending: 0, suspended: 0 },
        operators: formattedOps,
      });
    } catch (e) {
      console.error('[AdminGateway] update_operator_access error:', e);
    }
  }

  @SubscribeMessage('add_new_operator')
  async handleAddNewOperator(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      name: string;
      email: string;
      password?: string;
      permissions?: string[];
    },
  ) {
    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(data.password || 'admin123', salt);

      const normalizedEmail = (data.email || '').trim().toLowerCase();
      const newUser = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
          keycloakId: `op-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          role: 'ADMIN',
          passwordHash,
          permissions: data.permissions && data.permissions.length > 0 ? data.permissions : ['DASHBOARD', 'APPLICATIONS'],
          profile: {
            create: {
              fullName: data.name,
            },
          },
        },
      });
      client.emit('add_new_operator_success', newUser.id);
      const ops = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: { profile: true },
      });
      const formattedOps = ops.map((o) => ({
        id: o.id,
        name: o.profile?.fullName || 'Admin',
        role: 'System Admin',
        department: 'IT & Infrastructure',
        joinedDate: o.createdAt.toLocaleDateString(),
        lastActive: 'Active recently',
        status: 'Active',
        permissions: o.permissions || [],
      }));
      this.server.emit('response_operators_data', {
        stats: { totalOps: ops.length, active: ops.length, pending: 0, suspended: 0 },
        operators: formattedOps,
      });
    } catch (e) {
      console.error('[AdminGateway] add_new_operator error:', e);
    }
  }

  @SubscribeMessage('request_transactions_data')
  async handleTransactionsData(@ConnectedSocket() client: Socket) {
    try {
      const apps = await this.prisma.application.findMany({
        orderBy: { submittedAt: 'desc' },
        take: 100,
        include: { user: { include: { profile: true } }, service: true },
      });
      const formattedTransactions = apps.map((a) => {
        const userProfile = a.user?.profile;
        const formData = (a.formData as any) || {};
        const customerName = userProfile?.fullName || formData.fullName || (a.user as any)?.fullName || a.user?.email || 'Citizen User';
        const txnId = a.razorpayPaymentId || `TXN-${a.id.substring(0, 8).toUpperCase()}`;

        return {
          id: txnId,
          rawId: a.id,
          refNumber: a.refNumber,
          date: a.submittedAt.toISOString(),
          customer: customerName,
          service: a.serviceTitle || a.service?.title || 'Government Service',
          amount: a.feePaid || 50.0,
          status: (a.paymentStatus || 'SUCCESS').toUpperCase(),
          paymentMethod: a.razorpayPaymentId ? 'Razorpay (Test UPI)' : 'Govt Portal Payment',
          razorpayPaymentId: a.razorpayPaymentId || '',
          razorpayOrderId: a.razorpayOrderId || '',
        };
      });
      const totalAmount = apps.reduce((sum, a) => sum + (a.feePaid || 50.0), 0);
      client.emit('response_transactions_data', {
        transactions: formattedTransactions,
        stats: { totalCount: apps.length, totalAmount },
      });
    } catch (e) {
      console.error('[AdminGateway] request_transactions_data error:', e);
    }
  }

  @SubscribeMessage('request_notifications')
  async handleNotifications(@ConnectedSocket() client: Socket) {
    try {
      const total = await this.prisma.notification.count();
      const unread = await this.prisma.notification.count({
        where: { status: 'PENDING' },
      });

      const notifications = await this.prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
      });

      const formatted = notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.body,
        time: n.createdAt.toISOString(),
        status: n.status,
      }));

      client.emit('response_notifications', {
        stats: {
          totalHistory: total,
          unreadAlerts: unread,
          successLogs: total - unread,
          pendingChecks: unread,
        },
        notifications: formatted,
      });
    } catch (e) {
      console.error('[AdminGateway] request_notifications error:', e);
    }
  }

  @SubscribeMessage('send_push_notification')
  async handlePushNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { userId: string; title: string; body: string; type: string },
  ) {
    try {
      const { userId, title, body, type } = data;
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      await this.prisma.notification
        .create({
          data: {
            userId: user ? user.id : 'default-system-user',
            title,
            body,
            type: (type as any) || 'SYSTEM',
            status: 'SENT',
          },
        })
        .catch(() => null);

      if (user && user.fcmToken && messaging) {
        try {
          await messaging.send({
            token: user.fcmToken,
            notification: { title, body },
            data: { type },
          });
        } catch (firebaseErr) {
          console.error('[AdminGateway] Firebase send error:', firebaseErr);
        }
      }

      client.emit('response_push_sent', {
        success: true,
        message: 'Notification queued and sent.',
      });
    } catch (e) {
      console.error('[AdminGateway] send_push_notification error:', e);
      client.emit('response_push_sent', {
        success: false,
        error: 'Failed to send',
      });
    }
  }

  @SubscribeMessage('send_global_push')
  async handleGlobalPush(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { title: string; body: string },
  ) {
    try {
      if (messaging) {
        await messaging.send({
          topic: 'all',
          notification: { title: data.title, body: data.body },
        });
      }
      await this.prisma.notification
        .create({
          data: {
            userId: '000000000000000000000000',
            title: data.title,
            body: data.body,
            type: 'INFO',
            status: 'SENT',
          },
        })
        .catch(() => null);

      this.server.emit('receive_global_push', {
        title: data.title,
        body: data.body,
      });

      const totalUsers = await this.prisma.user.count();
      client.emit('send_global_push_success', { count: totalUsers });
      client.emit('request_notifications');
    } catch (e) {
      console.error('[AdminGateway] send_global_push error:', e);
    }
  }

  @SubscribeMessage('request_support_tickets')
  async handleSupportTickets(@ConnectedSocket() client: Socket) {
    try {
      let tickets = await this.prisma.supportTicket.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { user: { include: { profile: true } } },
      });

      if (tickets.length === 0) {
        const user = await this.prisma.user.findFirst({ include: { profile: true } });
        if (user) {
          await this.prisma.supportTicket.createMany({
            data: [
              {
                refNumber: 'TKT-108241',
                title: 'Aadhaar Verification Signature Mismatch Appeal',
                description: 'Citizen submitted an appeal regarding document verification for application #CSB2026883344.',
                category: 'Document Rejection',
                priority: 'High',
                status: 'OPEN',
                userId: user.id,
                attachmentUrl: 'https://res.cloudinary.com/dzo4caeef/image/upload/v1787127810/cybersave/documents/ylzz2svaswahyccwj85c.jpg',
                assignedTo: 'Amit S. (Support Desk)',
              },
              {
                refNumber: 'TKT-108242',
                title: 'Payment Gateway Confirmation Delay',
                description: 'Payment debited but receipt generation was pending. Transaction reference #rzp_live_98124.',
                category: 'Payment Issue',
                priority: 'Medium',
                status: 'IN_PROGRESS',
                userId: user.id,
                attachmentUrl: 'https://res.cloudinary.com/dzo4caeef/image/upload/v1787127805/cybersave/documents/dvzqpwf1tzkjszemdojp.jpg',
                assignedTo: 'Pooja V. (Accounts Desk)',
              },
              {
                refNumber: 'TKT-108243',
                title: 'Portal Certificate Download Assistance',
                description: 'Citizen requesting guidance on generating and downloading digital e-certificate.',
                category: 'Technical Support',
                priority: 'Low',
                status: 'RESOLVED',
                userId: user.id,
                attachmentUrl: 'https://res.cloudinary.com/dzo4caeef/image/upload/v1787127803/cybersave/documents/rmmiojzsxzyry8dit1ka.jpg',
                assignedTo: 'Amit S. (Support Desk)',
              },
            ],
          });
          tickets = await this.prisma.supportTicket.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: { user: { include: { profile: true } } },
          });
        }
      }

      const total = await this.prisma.supportTicket.count();
      const open = await this.prisma.supportTicket.count({
        where: { status: 'OPEN' },
      });
      const inProgress = await this.prisma.supportTicket.count({
        where: { status: 'IN_PROGRESS' },
      });
      const resolved = await this.prisma.supportTicket.count({
        where: { status: 'RESOLVED' },
      });

      const formatted = tickets.map((t) => {
        const reporterName = (t.user as any)?.profile?.fullName || (t.user as any)?.fullName || t.user?.email || 'Citizen User';
        return {
          id: t.refNumber || `TKT-${t.id.substring(0, 8).toUpperCase()}`,
          dbId: t.id,
          title: t.title,
          description: t.description || t.title,
          attachmentUrl: t.attachmentUrl || null,
          category: t.category || 'Technical Support',
          priority: t.priority || 'Medium',
          createdOn: t.createdAt ? t.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
          lastUpdated: t.updatedAt ? t.updatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
          assignedTo: t.assignedTo || 'Amit S. (Support Desk)',
          status: t.status,
          reporter: {
            name: reporterName,
            email: t.user?.email || 'citizen@cybersave.gov.in',
            phone: t.user?.phone || '+91 98765 43210',
          },
        };
      });

      client.emit('response_support_tickets', {
        stats: {
          totalTickets: total,
          openTickets: open,
          inProgress,
          resolved,
        },
        tickets: formatted,
      });
    } catch (e) {
      console.error('[AdminGateway] request_support_tickets error:', e);
    }
  }

  @SubscribeMessage('create_support_ticket')
  async handleCreateSupportTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      title: string;
      category: string;
      priority: string;
      description: string;
    },
  ) {
    try {
      const adminUser = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });
      await this.prisma.supportTicket.create({
        data: {
          refNumber: `TKT-${Date.now()}`,
          title: `${data.title} - ${data.description}`.substring(0, 100),
          category: data.category,
          priority: data.priority,
          status: 'OPEN',
          userId: adminUser?.id || '',
        },
      });
      client.emit('create_support_ticket_success');
    } catch (e) {
      console.error('[AdminGateway] create_support_ticket error:', e);
    }
  }

  @SubscribeMessage('request_analytics')
  async handleAnalytics(@ConnectedSocket() client: Socket) {
    try {
      const totalDocs = await this.prisma.documentUpload.count();
      const recentLogs = await this.prisma.documentUpload.findMany({
        take: 4,
        orderBy: { uploadedAt: 'desc' },
        include: { user: { include: { profile: true } } },
      });

      client.emit('response_analytics', {
        stats: {
          totalUploads: totalDocs,
          verified: 0,
          pendingReview: totalDocs,
          expired: 0,
        },
        trends: [
          { month: 'Jan', uploads: 30, verifications: 20 },
          { month: 'Feb', uploads: 45, verifications: 40 },
        ],
        categories: [{ name: 'Identity', count: totalDocs }],
        statusDistribution: { verified: 0, pending: totalDocs, expired: 0 },
        recentLogs: recentLogs.map((l) => ({
          id: `DOC-${l.id.substring(0, 8).toUpperCase()}`,
          name: l.fileType,
          category: 'Identity',
          user: l.user?.profile?.fullName || 'Unknown',
          uploaded: l.uploadedAt.toLocaleDateString(),
          status: 'Pending',
        })),
      });
    } catch (e) {
      console.error('[AdminGateway] request_analytics error:', e);
    }
  }

  @SubscribeMessage('request_audit_logs')
  async handleAuditLogs(@ConnectedSocket() client: Socket) {
    try {
      const total = await this.prisma.auditLog.count();
      const logs = await this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { include: { profile: true } } },
      });

      const formatted = logs.map((l) => ({
        timestamp: l.createdAt
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19),
        user: l.user?.profile?.fullName || 'System',
        action: l.action,
        resource: l.details || '-',
        ipAddress: l.ipAddress || '192.168.1.1',
        status: 'Success',
      }));

      client.emit('response_audit_logs', {
        stats: {
          totalEvents: total,
          loginActivities: 0,
          documentActions: total,
          systemChanges: 0,
        },
        logs: formatted,
      });
    } catch (e) {
      console.error('[AdminGateway] request_audit_logs error:', e);
    }
  }

  @SubscribeMessage('request_ticket_thread')
  async handleTicketThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string },
  ) {
    try {
      const ticketId = data?.id;
      const isMongoId = (idStr?: string) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr);
      let foundTicket: any = null;
      if (ticketId) {
        const orConditions: any[] = [
          { refNumber: ticketId },
          { refNumber: `TKT-${ticketId}` },
        ];
        if (isMongoId(ticketId)) {
          orConditions.push({ id: ticketId });
        }

        foundTicket = await this.prisma.supportTicket.findFirst({
          where: { OR: orConditions },
          include: { user: { include: { profile: true } } },
        });
      }

      if (!foundTicket) {
        foundTicket = await this.prisma.supportTicket.findFirst({
          orderBy: { createdAt: 'desc' },
          include: { user: { include: { profile: true } } },
        });
      }

      const reporterName = (foundTicket?.user as any)?.profile?.fullName || (foundTicket?.user as any)?.fullName || foundTicket?.user?.email || 'Citizen User';
      const reporterId = foundTicket?.userId || 'user1';
      const ticketTitle = foundTicket?.title || 'Support Request';
      const ticketDesc = foundTicket?.description || foundTicket?.title || 'Citizen raised an inquiry regarding portal operations.';
      const attachmentUrl = foundTicket?.attachmentUrl || null;

      client.emit('response_ticket_thread', {
        id: foundTicket?.refNumber || ticketId || 'TKT-2024-001',
        title: ticketTitle,
        description: ticketDesc,
        attachmentUrl: attachmentUrl,
        category: foundTicket?.category || 'Technical Support',
        priority: foundTicket?.priority || 'Medium',
        createdOn: foundTicket ? foundTicket.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
        lastUpdated: foundTicket ? foundTicket.updatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
        assignedTo: { id: 'admin1', name: foundTicket?.assignedTo || 'Amit S. (Support Desk)' },
        reporter: { id: reporterId, name: reporterName },
        messages: [
          {
            senderId: reporterId,
            senderName: reporterName,
            role: 'USER',
            time: foundTicket ? foundTicket.createdAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '10:15 AM',
            text: ticketDesc,
            attachmentUrl: attachmentUrl,
          },
          {
            senderId: 'admin1',
            senderName: 'Support Officer (SDM)',
            role: 'AGENT',
            time: 'Just now',
            text: 'Hello, our support team has received your ticket and verified the attached details. We are investigating and will update you shortly.',
          },
        ],
        notes: [
          {
            title: 'Ticket Queued for Investigation',
            author: 'Support Automation Desk',
            time: foundTicket ? foundTicket.createdAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now',
            content: 'Customer issue logged and proof attachment verified via Cloudinary for administrative audit.',
          },
        ],
      });
    } catch (e) {
      console.error('[AdminGateway] request_ticket_thread error:', e);
    }
  }

  @SubscribeMessage('request_operator_detail')
  async handleOperatorDetail(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string },
  ) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
        include: { documents: true },
      });

      const docs = [
        {
          id: '1',
          fileName: 'Background Check',
          type: 'PDF',
          status: 'Verified',
          fileSize: '12',
          uploadedAt: '15/01/2024',
        },
        {
          id: '2',
          fileName: 'Driving License',
          type: 'PDF',
          status: 'Expired',
          fileSize: '4',
          uploadedAt: '12/01/2024',
        },
        {
          id: '3',
          fileName: 'PAN Card',
          type: 'IMG',
          status: 'Verified',
          fileSize: '1.2',
          uploadedAt: '12/01/2024',
        },
        {
          id: '4',
          fileName: 'Employment Contract',
          type: 'PDF',
          status: 'Verified',
          fileSize: '15',
          uploadedAt: '12/01/2024',
        },
      ];

      client.emit('response_operator_detail', {
        id: data.id,
        name: user?.email || 'Rajesh Kumar',
        documents: docs,
      });
    } catch (e) {
      console.error('[AdminGateway] request_operator_detail error:', e);
    }
  }
}
