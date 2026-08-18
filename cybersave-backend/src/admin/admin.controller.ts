import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@ApiTags('Admin Portal')
@Controller()
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Handles both /api/auth/login and /auth/login for the admin portal
  @Post(['api/auth/login', 'auth/login'])
  @ApiOperation({ summary: 'Admin Portal Login' })
  async adminLogin(@Body() body: any) {
    const { email, password } = body;
    if (!email || !password) {
      throw new BadRequestException('Email and password required');
    }

    const user = await this.prisma.user.findFirst({
      where: { email, role: 'ADMIN' },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials or not an admin');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      accessToken: token,
      admin: {
        id: user.id,
        email: user.email,
        permissions: user.permissions || [],
      },
    };
  }

  @Get('api/admin/dashboard')
  @ApiOperation({ summary: 'Admin Dashboard Data' })
  async getDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalApps = await this.prisma.application.count();
    const appsToday = await this.prisma.application.count({
      where: { submittedAt: { gte: today } },
    });
    const pendingApps = await this.prisma.application.count({
      where: { status: 'PENDING' },
    });
    const completedAppsToday = await this.prisma.application.count({
      where: { status: 'COMPLETED', updatedAt: { gte: today } },
    });
    const rejectedAppsToday = await this.prisma.application.count({
      where: { status: 'REJECTED', updatedAt: { gte: today } },
    });

    const activeCentres = await this.prisma.user.count({
      where: { role: 'ADMIN' },
    });

    const todayAppsList = await this.prisma.application.findMany({
      where: { submittedAt: { gte: today } },
      select: { feePaid: true },
    });
    const revenueToday = todayAppsList.reduce(
      (sum, app) => sum + (app.feePaid || 0),
      0,
    );

    return {
      stats: {
        revenueToday,
        appsToday,
        pendingApps,
        completedAppsToday,
        rejectedAppsToday,
        activeCentres,
      },
      collections: {
        totalCollections: 1240000,
        onlinePayments: 820000,
        cashCollections: 420000,
      },
      serviceShare: [
        { name: 'Aadhaar', percentage: 35 },
        { name: 'PAN Card', percentage: 22 },
        { name: 'Certificates', percentage: 18 },
        { name: 'Banking', percentage: 15 },
        { name: 'Other', percentage: 10 },
      ],
      operatorLogs: [
        {
          id: '1',
          title: 'Action',
          description: 'Sample log',
          time: new Date().toISOString(),
        },
      ],
      recentApps: [],
      charts: { revenueOverview: [], applicationTrends: [] },
    };
  }

  @Get('api/admin/users')
  @ApiOperation({ summary: 'Admin Users List' })
  async getUsers() {
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
      include: { profile: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const formattedUsers = users.map((u) => ({
      id: `CIT-${u.id.substring(0, 5).toUpperCase()}`,
      fullName: u.profile?.fullName || 'Unknown',
      aadhaar: '****' + Math.floor(1000 + Math.random() * 9000),
      mobile: u.phone || 'N/A',
      district: u.profile?.district || 'Lucknow',
      servicesUsed: Math.floor(Math.random() * 8) + 1,
      status: 'Verified',
      lastActive: '2 hours ago',
    }));

    return {
      stats: {
        totalCitizens,
        activeCitizens,
        newThisMonth,
        pendingVerification: 892,
      },
      users: formattedUsers,
    };
  }

  @Get('api/admin/applications')
  @ApiOperation({ summary: 'Admin Applications List' })
  async getApplications() {
    const totalApps = await this.prisma.application.count();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayApps = await this.prisma.application.count({
      where: { submittedAt: { gte: today } },
    });
    const pending = await this.prisma.application.count({
      where: { status: 'VERIFYING' },
    });
    const processing = await this.prisma.application.count({
      where: { status: 'IN_PROGRESS' },
    });
    const completed = await this.prisma.application.count({
      where: { status: 'APPROVED' },
    });

    const apps = await this.prisma.application.findMany({
      take: 8,
      orderBy: { submittedAt: 'desc' },
      include: { user: { include: { profile: true } }, service: true },
    });

    const formattedApps = apps.map((a) => ({
      id: `APP-2026-${a.id.substring(0, 4).toUpperCase()}`,
      citizen: a.user?.profile?.fullName || 'Unknown',
      serviceType: a.serviceTitle,
      priority: 'Medium',
      status:
        a.status === 'SUBMITTED'
          ? 'In Review'
          : a.status === 'VERIFYING'
            ? 'Pending'
            : a.status === 'IN_PROGRESS'
              ? 'Processing'
              : a.status === 'APPROVED'
                ? 'Completed'
                : 'Rejected',
      assigned: 'Vikram T.',
      submitted: a.submittedAt.toISOString(),
      sla: '4h 32m',
      amount: a.feePaid,
    }));

    return {
      stats: { totalApps, todayApps, pending, processing, completed },
      applications: formattedApps,
    };
  }

  @Get('api/admin/services')
  @ApiOperation({ summary: 'Admin Services' })
  async getServicesAdmin() {
    const totalServices = await this.prisma.service.count();
    const activeServices = await this.prisma.service.count({
      where: { isActive: true },
    });
    const services = await this.prisma.service.findMany({ take: 20 });

    const grouped = [
      {
        category: 'Aadhaar Services',
        department: 'Ministry of Electronics & IT',
        subServices: services.map((s) => ({
          name: s.title,
          category: s.category,
          sla: s.processingTime,
          fee: s.fee,
          status: s.isActive ? 'Active' : 'Inactive',
        })),
      },
    ];

    return {
      stats: {
        totalServices,
        activeServices,
        underMaintenance: 4,
        totalRequests: 148291,
      },
      services: grouped,
    };
  }

  @Get('api/admin/operators')
  @ApiOperation({ summary: 'Admin Operators List' })
  async getOperators() {
    const totalOps = await this.prisma.user.count({ where: { role: 'ADMIN' } });
    const ops = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: { profile: true },
      take: 9,
    });

    const formattedOps = ops.map((o) => ({
      id: o.id,
      name: o.profile?.fullName || 'Admin',
      role: 'System Admin',
      department: 'IT & Infrastructure',
      joinedDate: o.createdAt.toLocaleDateString(),
      lastActive: '2 mins ago',
      status: 'Active',
      permissions: o.permissions || [],
    }));

    return {
      stats: { totalOps, active: totalOps, pending: 0, suspended: 0 },
      operators: formattedOps,
    };
  }

  // Alias endpoint for /api/services so both mobile and web can fetch without version prefix
  @Get('api/services')
  @ApiOperation({ summary: 'Public Services list alias' })
  async getServicesAlias() {
    const services = await this.prisma.service.findMany({
      where: { isActive: true },
    });
    return { services };
  }
}
