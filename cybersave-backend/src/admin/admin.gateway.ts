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
  static userSockets = new Map<string, Set<string>>();
  static socketToUser = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {
    AdminGateway.instance = this;
  }

  static broadcast(event: string, data?: any) {
    if (AdminGateway.instance?.server) {
      AdminGateway.instance.server.emit(event, data);
    }
  }

  static async logActivity(
    prisma: PrismaService,
    params: {
      userId?: string;
      userEmail?: string;
      userName?: string;
      action: string;
      details: string;
      ipAddress?: string;
    },
  ) {
    try {
      let resolvedUserId = params.userId;
      const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);

      let foundUser: any = null;
      if (resolvedUserId && isMongoId(resolvedUserId)) {
        foundUser = await prisma.user.findUnique({
          where: { id: resolvedUserId },
          include: { profile: true },
        }).catch(() => null);
      }

      if (!foundUser && params.userEmail) {
        foundUser = await prisma.user.findFirst({
          where: { email: params.userEmail.toLowerCase().trim() },
          include: { profile: true },
        }).catch(() => null);
        if (foundUser) resolvedUserId = foundUser.id;
      }

      if (!foundUser) {
        foundUser = await prisma.user.findFirst({
          where: { OR: [{ email: 'admin@cybersave.com' }, { role: 'ADMIN' }] },
          include: { profile: true },
        }).catch(() => null);
        if (foundUser) resolvedUserId = foundUser.id;
      }

      const log = await prisma.auditLog.create({
        data: {
          userId: resolvedUserId,
          action: params.action,
          details: params.details,
          ipAddress: params.ipAddress || '192.168.1.1',
        },
        include: { user: { include: { profile: true } } },
      });

      const officerName = params.userName || log.user?.profile?.fullName || log.user?.email?.split('@')[0] || 'Sub-Admin Operator';
      const officerEmail = params.userEmail || log.user?.email || '';

      AdminGateway.broadcast('audit_logs_updated');
      AdminGateway.broadcast('audit_log_added', {
        id: log.id,
        timestamp: log.createdAt.toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        }),
        user: officerName,
        userEmail: officerEmail,
        action: log.action,
        resource: log.details || '-',
        ipAddress: log.ipAddress || '192.168.1.1',
        status: (log.action.includes('REJECT') || log.action.includes('SUSPEND') || log.action.includes('FAIL')) ? 'Failed' : 'Success',
      });
      return log;
    } catch (err: any) {
      console.warn('[AdminGateway.logActivity] Warning recording audit log:', err?.message);
    }
  }

  static isUserOnline(userId: string): boolean {
    const s = AdminGateway.userSockets.get(userId);
    return !!(s && s.size > 0);
  }

  static emitToUser(userId: string, event: string, data: any): boolean {
    if (!AdminGateway.instance?.server) return false;
    AdminGateway.instance.server.to(`user_${userId}`).emit(event, data);
    const sockets = AdminGateway.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      sockets.forEach((sId) => {
        AdminGateway.instance?.server?.to(sId).emit(event, data);
      });
      return true;
    }
    return false;
  }

  handleConnection(client: Socket) {
    console.log('[AdminGateway] Client connected:', client.id);
  }

  async handleDisconnect(client: Socket) {
    console.log('[AdminGateway] Client disconnected:', client.id);
    const userId = AdminGateway.socketToUser.get(client.id);
    if (userId) {
      AdminGateway.socketToUser.delete(client.id);
      const userSet = AdminGateway.userSockets.get(userId);
      if (userSet) {
        userSet.delete(client.id);
        if (userSet.size === 0) {
          AdminGateway.userSockets.delete(userId);
          try {
            await this.prisma.user.update({
              where: { id: userId },
              data: { isOnline: false, lastSeenAt: new Date() },
            }).catch(() => null);
          } catch {}
          AdminGateway.broadcast('user_status_changed', {
            userId,
            isOnline: false,
            lastSeenAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  @SubscribeMessage('user_connected')
  @SubscribeMessage('citizen_heartbeat')
  async handleUserConnected(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; fcmToken?: string },
  ) {
    try {
      const { userId, fcmToken } = data || {};
      if (!userId) return;

      let resolvedId = userId;
      if (resolvedId.startsWith('CIT-')) {
        const short = resolvedId.replace('CIT-', '').toUpperCase();
        const u = await this.prisma.user.findFirst({ where: { role: 'USER' } });
        if (u) resolvedId = u.id;
      }

      client.join(`user_${resolvedId}`);
      AdminGateway.socketToUser.set(client.id, resolvedId);
      if (!AdminGateway.userSockets.has(resolvedId)) {
        AdminGateway.userSockets.set(resolvedId, new Set());
      }
      AdminGateway.userSockets.get(resolvedId)!.add(client.id);

      const updateData: any = { isOnline: true, lastSeenAt: new Date() };
      if (fcmToken) updateData.fcmToken = fcmToken;

      if (/^[0-9a-fA-F]{24}$/.test(resolvedId)) {
        await this.prisma.user.update({
          where: { id: resolvedId },
          data: updateData,
        }).catch(() => null);
      }

      AdminGateway.broadcast('user_status_changed', {
        userId: resolvedId,
        isOnline: true,
        lastSeenAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[AdminGateway] user_connected error:', e);
    }
  }

  @SubscribeMessage('register_fcm_token')
  async handleRegisterFcmToken(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; fcmToken: string },
  ) {
    try {
      const { userId, fcmToken } = data;
      if (userId && fcmToken && /^[0-9a-fA-F]{24}$/.test(userId)) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { fcmToken },
        }).catch(() => null);
      }
    } catch (e) {
      console.error('[AdminGateway] register_fcm_token error:', e);
    }
  }

  @SubscribeMessage('request_dashboard_data')
  async handleDashboardData(@ConnectedSocket() client: Socket) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allApps = await this.prisma.application.findMany({
        include: { user: { include: { profile: true } } },
        orderBy: { submittedAt: 'desc' },
      });

      const todayApps = allApps.filter((a) => {
        const d = new Date(a.submittedAt || a.updatedAt);
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
      const pendingApps = allApps.filter((a) => {
        const st = (a.status || '').toUpperCase();
        return st === 'PENDING' || st === 'SUBMITTED' || st === 'VERIFYING' || st === 'IN_PROGRESS';
      }).length;
      const completedAppsToday = todayApps.filter((a) => {
        const st = (a.status || '').toUpperCase();
        return st === 'COMPLETED' || st === 'APPROVED';
      }).length;
      const totalApproved = allApps.filter((a) => {
        const st = (a.status || '').toUpperCase();
        return st === 'COMPLETED' || st === 'APPROVED';
      }).length;
      const rejectedAppsToday = todayApps.filter((a) => (a.status || '').toUpperCase() === 'REJECTED').length;

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
          const appDate = new Date(a.submittedAt || a.updatedAt);
          return appDate >= d && appDate < nextD;
        });

        const dayRev = dayApps.reduce((acc, a) => {
          const fee = typeof a.feePaid === 'number' && !isNaN(a.feePaid) ? a.feePaid : (a.feePaid ? Number(a.feePaid) : 55.0);
          return acc + fee;
        }, 0);
        const dayComp = dayApps.filter((a) => {
          const st = (a.status || '').toUpperCase();
          return st === 'COMPLETED' || st === 'APPROVED';
        }).length;
        const dayPend = dayApps.filter((a) => {
          const st = (a.status || '').toUpperCase();
          return st === 'PENDING' || st === 'SUBMITTED' || st === 'VERIFYING' || st === 'IN_PROGRESS';
        }).length;
        const dayRej = dayApps.filter((a) => (a.status || '').toUpperCase() === 'REJECTED').length;

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
          totalApproved: totalApproved,
          approvedApps: totalApproved,
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

      const formattedUsers = users.map((u) => {
        const isOnline = AdminGateway.isUserOnline(u.id) || u.isOnline === true;
        let lastActive = 'Active Now';
        if (!isOnline) {
          const lastTime = u.lastSeenAt || u.updatedAt || u.createdAt;
          if (lastTime) {
            const diffSec = Math.floor((Date.now() - new Date(lastTime).getTime()) / 1000);
            if (diffSec < 60) lastActive = 'Just now';
            else if (diffSec < 3600) lastActive = `${Math.floor(diffSec / 60)} mins ago`;
            else if (diffSec < 86400) lastActive = `${Math.floor(diffSec / 3600)} hours ago`;
            else lastActive = new Date(lastTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          } else {
            lastActive = 'Offline';
          }
        }

        return {
          id: `CIT-${u.id.substring(0, 5).toUpperCase()}`,
          dbId: u.id,
          fullName: u.profile?.fullName || (u.email ? u.email.split('@')[0] : 'Citizen'),
          aadhaar: u.profile?.dob
            ? '****' + Math.floor(1000 + Math.random() * 9000)
            : 'Not Given',
          mobile: u.phone || u.profile?.phone || 'N/A',
          email: u.email || 'N/A',
          district: u.profile?.district || 'Central Delhi, DL',
          servicesUsed: u.applications?.length || 0,
          status: u.status === 'BLOCKED' ? 'Blocked' : (u.status || 'Verified'),
          avatarUrl: u.profile?.avatarUrl || null,
          isOnline,
          lastActive,
          lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
        };
      });

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
      const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
      let u: any = null;

      if (isMongoId(realId)) {
        u = await this.prisma.user.findUnique({
          where: { id: realId },
          include: {
            profile: true,
            applications: { include: { service: true }, orderBy: { submittedAt: 'desc' } },
            documents: true,
            aadhaarDocs: true,
            auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
            feedbacks: { orderBy: { createdAt: 'desc' } },
          },
        });
      }

      if (!u && realId.startsWith('CIT-')) {
        const shortId = realId.replace('CIT-', '').toUpperCase();
        const allUsers = await this.prisma.user.findMany({
          where: { role: 'USER' },
          include: {
            profile: true,
            applications: { include: { service: true }, orderBy: { submittedAt: 'desc' } },
            documents: true,
            aadhaarDocs: true,
            auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
            feedbacks: { orderBy: { createdAt: 'desc' } },
          },
        });
        u = allUsers.find((x) => x.id.substring(0, 5).toUpperCase() === shortId) || null;
      }

      if (!u) {
        u = await this.prisma.user.findFirst({
          where: { OR: [{ id: realId }, { email: realId }, { phone: realId }] },
          include: {
            profile: true,
            applications: { include: { service: true }, orderBy: { submittedAt: 'desc' } },
            documents: true,
            aadhaarDocs: true,
            auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
            feedbacks: { orderBy: { createdAt: 'desc' } },
          },
        });
      }

      if (!u) {
        u = await this.prisma.user.findFirst({
          where: { role: 'USER' },
          include: {
            profile: true,
            applications: { include: { service: true }, orderBy: { submittedAt: 'desc' } },
            documents: true,
            aadhaarDocs: true,
            auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
            feedbacks: { orderBy: { createdAt: 'desc' } },
          },
        });
      }

      if (!u) {
        client.emit('response_user_detail', { error: 'User not found' });
        return;
      }

      const formatted = this.formatCitizenPayload(u);
      client.emit('response_user_detail', formatted);
    } catch (e) {
      console.error('[AdminGateway] request_user_detail error:', e);
    }
  }

  @SubscribeMessage('update_citizen_profile')
  async handleUpdateCitizenProfile(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const { id, fullName, phone, email, address, district, state, pinCode, dob, gender, status } = data;
      const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
      let u: any = null;

      if (isMongoId(id)) {
        u = await this.prisma.user.findUnique({ where: { id }, include: { profile: true } });
      }
      if (!u && id?.startsWith('CIT-')) {
        const shortId = id.replace('CIT-', '').toUpperCase();
        const allUsers = await this.prisma.user.findMany({ where: { role: 'USER' }, include: { profile: true } });
        u = allUsers.find((x) => x.id.substring(0, 5).toUpperCase() === shortId) || null;
      }
      if (!u && id) {
        u = await this.prisma.user.findFirst({ where: { OR: [{ id }, { email: id }, { phone: id }] }, include: { profile: true } });
      }

      if (!u) {
        client.emit('update_citizen_error', { message: 'Citizen not found' });
        return;
      }

      await this.prisma.user.update({
        where: { id: u.id },
        data: {
          email: email || u.email,
          phone: phone || u.phone,
          status: status || u.status,
        },
      });

      if (u.profile) {
        await this.prisma.profile.update({
          where: { id: u.profile.id },
          data: {
            fullName: fullName ?? u.profile.fullName,
            phone: phone ?? u.profile.phone,
            email: email ?? u.profile.email,
            address: address ?? u.profile.address,
            district: district ?? u.profile.district,
            state: state ?? u.profile.state,
            pinCode: pinCode ?? u.profile.pinCode,
            dob: dob ?? u.profile.dob,
            gender: gender ?? u.profile.gender,
          },
        });
      } else {
        await this.prisma.profile.create({
          data: {
            userId: u.id,
            fullName: fullName || 'Citizen User',
            phone: phone || u.phone || '',
            email: email || u.email || '',
            address: address || '',
            district: district || '',
            state: state || '',
            pinCode: pinCode || '',
            dob: dob || '',
            gender: gender || '',
          },
        });
      }

      await this.prisma.auditLog.create({
        data: {
          userId: u.id,
          action: 'CITIZEN_PROFILE_UPDATED',
          details: `Admin updated citizen profile information`,
        },
      }).catch(() => null);

      const updated = await this.prisma.user.findUnique({
        where: { id: u.id },
        include: {
          profile: true,
          applications: { include: { service: true }, orderBy: { submittedAt: 'desc' } },
          documents: true,
          aadhaarDocs: true,
          auditLogs: { orderBy: { createdAt: 'desc' }, take: 15 },
        },
      });

      const formatted = this.formatCitizenPayload(updated);
      client.emit('update_citizen_success', formatted);
      AdminGateway.broadcast('response_user_detail', formatted);
      AdminGateway.broadcast('user_detail_updated', formatted);
    } catch (e) {
      console.error('[AdminGateway] update_citizen_profile error:', e);
      client.emit('update_citizen_error', { message: e.message });
    }
  }

  @SubscribeMessage('block_citizen')
  async handleBlockCitizen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string; status?: string },
  ) {
    try {
      let realId = data.id;
      const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
      let u: any = null;

      if (isMongoId(realId)) {
        u = await this.prisma.user.findUnique({ where: { id: realId } });
      }
      if (!u && realId?.startsWith('CIT-')) {
        const shortId = realId.replace('CIT-', '').toUpperCase();
        const allUsers = await this.prisma.user.findMany({ where: { role: 'USER' } });
        u = allUsers.find((x) => x.id.substring(0, 5).toUpperCase() === shortId) || null;
      }
      if (!u && realId) {
        u = await this.prisma.user.findFirst({ where: { OR: [{ id: realId }, { email: realId }, { phone: realId }] } });
      }

      if (!u) {
        console.error(`[AdminGateway] User not found: ${realId}`);
        return;
      }

      const nextStatus = data.status || (u.status === 'BLOCKED' ? 'Verified' : 'BLOCKED');

      await this.prisma.user.update({
        where: { id: u.id },
        data: { status: nextStatus },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: u.id,
          action: nextStatus === 'BLOCKED' ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
          details: `Admin changed citizen status to ${nextStatus}`,
        },
      }).catch(() => null);

      const updated = await this.prisma.user.findUnique({
        where: { id: u.id },
        include: {
          profile: true,
          applications: { include: { service: true }, orderBy: { submittedAt: 'desc' } },
          documents: true,
          aadhaarDocs: true,
          auditLogs: { orderBy: { createdAt: 'desc' }, take: 15 },
        },
      });

      const formatted = this.formatCitizenPayload(updated);
      client.emit('block_citizen_success', formatted);
      AdminGateway.broadcast('response_user_detail', formatted);
      AdminGateway.broadcast('user_detail_updated', formatted);
    } catch (e) {
      console.error('[AdminGateway] block_citizen error:', e);
    }
  }

  @SubscribeMessage('send_push_notification')
  async handleSendPushNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; title: string; body: string; type?: string },
  ) {
    try {
      const { userId, title, body, type } = data;
      if (!title || !body) {
        client.emit('response_push_sent', { success: false, error: 'Subject title and message body are required' });
        return;
      }

      const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
      let targetUser: any = null;

      if (isMongoId(userId)) {
        targetUser = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
      }
      if (!targetUser && userId?.startsWith('CIT-')) {
        const shortId = userId.replace('CIT-', '').toUpperCase();
        const allUsers = await this.prisma.user.findMany({ where: { role: 'USER' }, include: { profile: true } });
        targetUser = allUsers.find((x) => x.id.substring(0, 5).toUpperCase() === shortId) || null;
      }
      if (!targetUser && userId) {
        targetUser = await this.prisma.user.findFirst({
          where: { OR: [{ id: userId }, { email: userId }, { phone: userId }] },
          include: { profile: true },
        });
      }

      if (!targetUser) {
        client.emit('response_push_sent', { success: false, error: `Citizen target '${userId}' not found in records` });
        return;
      }

      // 1. Create Notification record in Database
      const notifRecord = await this.prisma.notification.create({
        data: {
          userId: targetUser.id,
          title: title.trim(),
          body: body.trim(),
          type: (type as any) || 'SYSTEM',
          status: 'SENT',
          sentAt: new Date(),
        },
      }).catch((err) => {
        console.warn('[AdminGateway] DB Notification create note:', err);
        return null;
      });

      // 2. Log in AuditTrail
      await this.prisma.auditLog.create({
        data: {
          userId: targetUser.id,
          action: 'NOTIFICATION_SENT',
          details: `Direct Push Notification sent: "${title.trim()}" - ${body.trim().substring(0, 55)}${body.length > 55 ? '...' : ''}`,
        },
      }).catch(() => null);

      // 3. Send FCM push notification to specific device token
      let fcmSent = false;
      if (targetUser.fcmToken && messaging) {
        try {
          await messaging.send({
            token: targetUser.fcmToken,
            notification: {
              title: title.trim(),
              body: body.trim(),
            },
            data: {
              title: title.trim(),
              body: body.trim(),
              type: type || 'SYSTEM',
              userId: targetUser.id,
              notificationId: notifRecord?.id || '',
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'default',
                sound: 'default',
                priority: 'max',
                visibility: 'public',
                clickAction: 'OPEN_ACTIVITY',
              },
            },
          });
          fcmSent = true;
          console.log(`[AdminGateway] FCM Push sent to user ${targetUser.id}`);
        } catch (firebaseErr: any) {
          console.warn('[AdminGateway] Firebase FCM note:', firebaseErr?.message || firebaseErr);
        }
      }

      // 4. Send targeted WebSocket event directly to citizen's active mobile socket & room
      const socketDispatched = AdminGateway.emitToUser(targetUser.id, 'user_push_notification', {
        id: notifRecord?.id || `notif_${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        type: type || 'SYSTEM',
        createdAt: new Date().toISOString(),
      });

      AdminGateway.emitToUser(targetUser.id, 'new_notification', {
        id: notifRecord?.id || `notif_${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        type: type || 'SYSTEM',
        createdAt: new Date().toISOString(),
      });

      // 5. Notify admin client
      client.emit('response_push_sent', {
        success: true,
        message: `Notification successfully pushed to ${targetUser.profile?.fullName || targetUser.phone || targetUser.email || 'Citizen'}.`,
        fcmSent,
        socketDispatched,
      });

      // 6. Broadcast updates to Admin Dashboards
      AdminGateway.broadcast('user_activity_updated', { userId: targetUser.id });
      AdminGateway.broadcast('audit_log_added');
    } catch (e: any) {
      console.error('[AdminGateway] send_push_notification error:', e);
      client.emit('response_push_sent', { success: false, error: e.message || 'Failed to send notification' });
    }
  }

  private formatCitizenPayload(u: any) {
    const apps = u.applications || [];
    const profile = u.profile || {};
    const firstAppForm = (apps[0]?.formData as any) || {};

    const rawFullName = profile.fullName || firstAppForm.fullName || (u.email ? u.email.split('@')[0] : null) || (u.phone ? `Citizen ${u.phone.slice(-4)}` : '');
    const formattedFullName = rawFullName
      ? rawFullName.trim().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
      : '';

    const fatherName = profile.fatherName || firstAppForm.fatherName || firstAppForm.father_name || '';
    const dob = profile.dob || u.aadhaarDocs?.[0]?.dateOfBirth || firstAppForm.dob || '';
    const gender = profile.gender || u.aadhaarDocs?.[0]?.gender || firstAppForm.gender || '';
    const aadhaar = profile.aadhaarNumber || u.aadhaarDocs?.[0]?.referenceId || firstAppForm.aadhaar || firstAppForm.aadhaarNumber || (profile.dob ? `•••• •••• ${u.id.slice(-4)}` : '');
    const pan = profile.pan || firstAppForm.pan || firstAppForm.panNumber || '';
    const mobile = u.phone || profile.phone || firstAppForm.phone || '';
    const email = u.email || profile.email || firstAppForm.email || '';
    const address = profile.address || u.aadhaarDocs?.[0]?.address || firstAppForm.address || '';
    const district = profile.district || firstAppForm.district || '';
    const state = profile.state || firstAppForm.state || firstAppForm.stateName || '';
    const pinCode = profile.pinCode || firstAppForm.pinCode || firstAppForm.pincode || '';

    const totalAmountSpent = apps.reduce((sum: number, a: any) => {
      const f = typeof a.feePaid === 'number' && !isNaN(a.feePaid) ? a.feePaid : (a.feePaid ? Number(a.feePaid) : 50.0);
      return sum + f;
    }, 0);

    const totalServices = apps.length;

    // Documents
    const docList: any[] = [];
    const seenDocUrls = new Set<string>();

    if (Array.isArray(u.documents)) {
      u.documents.forEach((d: any) => {
        if (d.fileUrl && !seenDocUrls.has(d.fileUrl)) {
          seenDocUrls.add(d.fileUrl);
          docList.push({
            id: d.id,
            name: d.fileName || 'Uploaded Document.pdf',
            fileUrl: d.fileUrl,
            date: d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
            status: 'Verified',
          });
        }
      });
    }

    if (Array.isArray(u.aadhaarDocs)) {
      u.aadhaarDocs.forEach((aDoc: any) => {
        docList.push({
          id: aDoc.id,
          name: `${aDoc.documentType || 'Aadhaar Offline e-KYC'}.pdf`,
          fileUrl: aDoc.fileStorageKey || '',
          date: aDoc.createdAt ? new Date(aDoc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
          status: 'Verified',
        });
      });
    }

    apps.forEach((a: any) => {
      if (Array.isArray(a.documents)) {
        a.documents.forEach((d: any, idx: number) => {
          const url = d.fileUrl || d.url || '';
          if (url && !seenDocUrls.has(url)) {
            seenDocUrls.add(url);
            docList.push({
              id: `${a.id}_doc_${idx}`,
              name: d.fileName || d.label || `${a.serviceTitle} Document.pdf`,
              fileUrl: url,
              date: a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
              status: 'Verified',
            });
          }
        });
      }
    });

    // Recent Services
    const recentServices = apps.map((a: any) => {
      const fee = typeof a.feePaid === 'number' && !isNaN(a.feePaid) ? a.feePaid : (a.feePaid ? Number(a.feePaid) : 50.0);
      const s = a.status;
      const statusLabel = s === 'APPROVED' || s === 'COMPLETED' ? 'Completed' : s === 'IN_PROGRESS' ? 'In Progress' : s === 'REJECTED' ? 'Rejected' : s === 'VERIFYING' ? 'Verifying' : 'Pending';

      return {
        id: a.id,
        refNumber: a.refNumber || `APP-${a.id.substring(0, 5).toUpperCase()}`,
        name: a.serviceTitle || a.service?.title || 'Government Service',
        serviceTitle: a.serviceTitle || a.service?.title || 'Government Service',
        amount: `₹${fee.toLocaleString('en-IN')}`,
        rawAmount: fee,
        status: statusLabel,
        rawStatus: a.status,
        date: a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
      };
    });

    // Feedbacks & Reviews
    const feedbacks = (u.feedbacks || []).map((fb: any) => ({
      id: fb.id,
      rating: fb.rating || 5,
      improvementCategory: fb.improvementCategory || 'App Experience',
      feedbackText: fb.feedbackText || '',
      imageUrl: fb.imageUrl || null,
      date: fb.createdAt ? new Date(fb.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
      dateTime: fb.createdAt ? new Date(fb.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently',
      createdAt: fb.createdAt ? fb.createdAt.toISOString() : null,
    }));

    // Recent Activity
    const rawLogs = u.auditLogs || [];
    const recentActivity: any[] = [];
    const seenLogDetails = new Set<string>();

    // ponytail: merge feedbacks directly into citizen recent activity
    feedbacks.forEach((fb: any) => {
      const starStr = '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating);
      const title = `${starStr} (${fb.rating}/5) Feedback: "${fb.feedbackText.substring(0, 50)}${fb.feedbackText.length > 50 ? '...' : ''}"`;
      seenLogDetails.add(fb.id);
      recentActivity.push({
        id: `fb_${fb.id}`,
        title,
        action: 'FEEDBACK_SUBMITTED',
        rating: fb.rating,
        category: fb.improvementCategory,
        feedbackText: fb.feedbackText,
        imageUrl: fb.imageUrl,
        date: fb.date,
        color: '#FFB800',
      });
    });

    rawLogs.forEach((l: any) => {
      let color = '#2563EB';
      if (l.action?.includes('REJECT') || l.action?.includes('BLOCK')) color = '#EF4444';
      else if (l.action?.includes('APPROV') || l.action?.includes('COMPLET') || l.action?.includes('PAY')) color = '#10B981';
      else if (l.action?.includes('FEEDBACK')) color = '#FFB800';
      else if (l.action?.includes('PEND') || l.action?.includes('VERIF')) color = '#F59E0B';

      // Avoid duplicate feedback logs if already merged above
      if (l.action === 'FEEDBACK_SUBMITTED' && feedbacks.length > 0) return;

      recentActivity.push({
        id: l.id,
        title: l.details || l.action.replace(/_/g, ' '),
        action: l.action,
        date: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
        color,
      });
    });

    if (recentActivity.length === 0 && apps.length > 0) {
      apps.forEach((a: any) => {
        recentActivity.push({
          id: `act_${a.id}`,
          title: `Application for ${a.serviceTitle} submitted`,
          action: 'APPLICATION_SUBMITTED',
          date: a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
          color: '#2563EB',
        });
      });
    }

    const isOnline = AdminGateway.isUserOnline(u.id) || u.isOnline === true;
    let lastActive = 'Active Now';
    if (!isOnline) {
      const lastTime = u.lastSeenAt || u.updatedAt || u.createdAt;
      if (lastTime) {
        const diffMs = Date.now() - new Date(lastTime).getTime();
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 60) lastActive = 'Just now';
        else if (diffSec < 3600) lastActive = `${Math.floor(diffSec / 60)} mins ago`;
        else if (diffSec < 86400) lastActive = `${Math.floor(diffSec / 3600)} hours ago`;
        else lastActive = new Date(lastTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } else {
        lastActive = 'Offline';
      }
    }

    return {
      id: `CIT-${u.id.substring(0, 5).toUpperCase()}`,
      dbId: u.id,
      fullName: formattedFullName,
      fatherName,
      dob,
      gender,
      aadhaar,
      pan,
      mobile,
      email,
      address,
      district,
      state,
      pinCode,
      joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Joined recently',
      status: u.status === 'BLOCKED' ? 'Blocked' : (u.status || 'Verified'),
      avatarUrl: profile.avatarUrl || null,
      isOnline,
      lastActive,
      lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
      quickStats: {
        totalServicesUsed: totalServices,
        totalAmountSpent: `₹${totalAmountSpent.toLocaleString('en-IN')}`,
        rawAmountSpent: totalAmountSpent,
        lastActive,
        registeredCentre: district ? `CSC ${district}, ${state || 'DL'}` : 'CSC Hazratganj, Lucknow',
        assignedOperator: 'Vikram Tiwari (VLE-0234)',
      },
      recentServices,
      uploadedDocuments: docList,
      recentActivity,
      feedbacks,
    };
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
    @MessageBody() data: {
      id?: string;
      applicationId?: string;
      refNumber?: string;
      status: string;
      rejectionReason?: string;
      adminId?: string;
      adminEmail?: string;
      adminName?: string;
      adminRole?: string;
    },
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

        const actingOfficerName = data.adminName || (data.adminEmail ? data.adminEmail.split('@')[0] : (updated.officialOfficer || 'Field Operator'));
        const actingOfficerEmail = data.adminEmail || '';
        const actingOfficerId = data.adminId;
        const actingRole = data.adminRole || (actingOfficerEmail === 'admin@cybersave.com' ? 'Super Administrator' : 'Sub-Admin / Operator');

        // Record in system audit log
        let auditAction = `APPLICATION_${mappedStatus}`;
        let auditDetails = `Application #${updated.refNumber} (${updated.serviceTitle || 'Citizen Service'}) transitioned to ${mappedStatus} by ${actingRole} ${actingOfficerName}`;
        if (mappedStatus === 'APPROVED') {
          auditAction = 'APPLICATION_APPROVED';
          auditDetails = `Application #${updated.refNumber} (${updated.serviceTitle || 'Citizen Service'}) verified & APPROVED by ${actingRole} ${actingOfficerName}. Digital certificate authorized.`;
        } else if (mappedStatus === 'REJECTED') {
          auditAction = 'APPLICATION_REJECTED';
          auditDetails = `Application #${updated.refNumber} (${updated.serviceTitle || 'Citizen Service'}) REJECTED by ${actingRole} ${actingOfficerName}. Reason: ${updated.rejectionReason || 'Document verification mismatch'}`;
        }

        await AdminGateway.logActivity(this.prisma, {
          userId: actingOfficerId,
          userEmail: actingOfficerEmail,
          userName: actingOfficerName,
          action: auditAction,
          details: auditDetails,
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
      const id = data?.id;
      if (!id) return;
      const isMongoId = (idStr?: string) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr);
      const orConditions: any[] = [{ refNumber: id }];
      if (isMongoId(id)) {
        orConditions.push({ id });
      }

      const app = await this.prisma.application.findFirst({
        where: { OR: orConditions },
        include: {
          user: { include: { profile: true } },
          service: true,
          documentUploads: true,
        },
      });

      if (!app) {
        client.emit('response_application_detail', null);
        return;
      }

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

      const profile = app.user?.profile;
      const formData = (app.formData as any) || {};

      client.emit('response_application_detail', {
        id: app.refNumber,
        rawId: app.id,
        refNumber: app.refNumber,
        serviceName: app.serviceTitle || app.service?.title || 'Government Service',
        serviceCategory: app.service?.category || 'Government',
        sla: '24h',
        submitted: app.submittedAt ? new Date(app.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Today',
        submittedAt: app.submittedAt,
        updatedAt: app.updatedAt,
        assignedTo: app.officialOfficer || 'Officer Sharma (SDM)',
        centre: formData.district ? `CSC ${formData.district}, ${formData.stateName || formData.state || ''}` : 'CSC Centre',
        status: app.status,
        rejectionReason: app.rejectionReason,
        feePaid: app.feePaid || 50.0,
        paymentStatus: app.paymentStatus || 'Success',
        razorpayPaymentId: app.razorpayPaymentId || '',
        razorpayOrderId: app.razorpayOrderId || '',
        formData: app.formData,
        documents: cleanedDocs,
        documentUploads: app.documentUploads || [],
        applicant: {
          name: profile?.fullName || formData?.fullName || 'Citizen Applicant',
          email: app.user?.email || formData?.email || '',
          phone: app.user?.phone || profile?.phone || formData?.phone || '',
          aadhaar: (profile as any)?.aadhaarNumber || formData?.aadhaarNumber || 'XXXX XXXX ****',
          dob: profile?.dob || formData?.dob || '',
          gender: profile?.gender || formData?.gender || '',
          state: profile?.state || formData?.stateName || formData?.state || '',
          district: profile?.district || formData?.district || '',
          pinCode: profile?.pinCode || formData?.pinCode || '',
          address: profile?.address || formData?.address || '',
          citizenId: app.userId,
        },
      });
    } catch (e) {
      console.error('[AdminGateway] request_application_detail error:', e);
      client.emit('response_application_detail', null);
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
          title: s.title,
          slug: s.slug,
          category: s.category,
          department: s.department,
          sla: s.processingTime || '5-7 Days',
          processingTime: s.processingTime || '5-7 Days',
          fee: s.fee || 50,
          description: s.description,
          subServices: s.subServices || [],
          formDataSchema: s.formDataSchema || [],
          requiredDocs: s.requiredDocs || [],
          pricingConfig: s.pricingConfig || { fee: s.fee || 50 },
          iconName: s.iconName || 'file-document-outline',
          colorHex: s.colorHex || '#2563eb',
          appliedCount: realCount,
          appliedText: `${realCount.toLocaleString()} applied`,
          status: s.isActive ? 'Active' : 'Inactive',
          isActive: s.isActive,
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
        rawServices: services,
      });
    } catch (e) {
      console.error('[AdminGateway] request_services_data error:', e);
    }
  }

  @SubscribeMessage('request_service_detail')
  async handleServiceDetail(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string },
  ) {
    try {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(data.id);
      let s: any = null;
      if (isMongoId) {
        s = await this.prisma.service.findUnique({ where: { id: data.id } });
      }
      if (!s) {
        s = await this.prisma.service.findFirst({
          where: {
            OR: [
              { slug: data.id },
              { title: { equals: data.id, mode: 'insensitive' } },
            ],
          },
        });
      }
      client.emit('response_service_detail', s);
    } catch (e) {
      console.error('[AdminGateway] request_service_detail error:', e);
      client.emit('response_service_detail', null);
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
      this.server.emit('services_updated');
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
  async handleSaveServiceConfig(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const rawTitle = data.name || data.title || 'Custom Service';
      const slug = (data.slug || rawTitle).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      const feeVal = typeof data.pricing?.fee === 'number' ? data.pricing.fee : (parseFloat(data.fee || '50.0') || 50.0);

      const resolvedIcon = data.iconUrl || data.imageUrl || data.iconName || 'file-document-outline';
      const pricingObj = {
        ...(typeof data.pricing === 'object' ? data.pricing : (typeof data.pricingConfig === 'object' ? data.pricingConfig : { fee: feeVal })),
        iconUrl: data.iconUrl || data.imageUrl || (resolvedIcon.startsWith('http') ? resolvedIcon : undefined),
      };

      const updateData: any = {
        title: rawTitle,
        description: data.description || data.shortDescription || 'Government certified digital service workflow.',
        category: data.category || 'Government',
        department: data.departmentRole || data.department || 'ID Processing & Verification (ID-V)',
        fee: feeVal,
        processingTime: data.tat || data.processingTime || '5-7 working days',
        subServices: data.subServices || [],
        formDataSchema: data.formElements || data.formDataSchema || [],
        requiredDocs: data.documents || data.requiredDocs || [],
        pricingConfig: pricingObj,
        iconName: resolvedIcon,
        colorHex: data.colorHex || '#2563eb',
        isActive: data.status === 'Active' || data.isActive === true || data.status === undefined,
      };

      const newService = await this.prisma.service.upsert({
        where: { slug },
        update: updateData,
        create: {
          slug,
          ...updateData,
          eligibility: data.eligibility || ['Citizen of India', 'Valid ID verification credentials'],
        },
      });

      console.log('[AdminGateway] Service configuration saved and published:', newService.id, newService.slug);
      client.emit('save_service_config_success', newService);
      this.server.emit('services_updated', newService);
    } catch (e) {
      console.error('[AdminGateway] save_service_config error:', e);
      client.emit('save_service_config_error', { error: e.message });
    }
  }

  @SubscribeMessage('request_operators_data')
  async handleOperatorsData(@ConnectedSocket() client: Socket) {
    try {
      let ops = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
      });

      if (ops.length === 0) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('operator123', salt);
        const createdOp = await this.prisma.user.create({
          data: {
            email: 'rajesh.kumar@cybersave.gov.in',
            phone: '+91 98765 43210',
            role: 'ADMIN',
            passwordHash,
            permissions: ['DASHBOARD', 'APPLICATIONS', 'OPERATORS', 'SETTINGS', 'USERS', 'REPORTS'],
            status: 'ACTIVE',
            profile: {
              create: {
                fullName: 'Rajesh Kumar',
                phone: '+91 98765 43210',
                email: 'rajesh.kumar@cybersave.gov.in',
                address: '45, Sector 4, HSR Layout, Bengaluru, Karnataka - 560102',
                district: 'Bengaluru',
                state: 'Karnataka',
                pinCode: '560102',
                dob: '15/08/1988',
                gender: 'Male',
              },
            },
          },
          include: { profile: true },
        });
        ops = [createdOp];
      }

      const totalOps = ops.length;
      const active = ops.filter((o) => o.status !== 'SUSPENDED').length;
      const suspended = ops.filter((o) => o.status === 'SUSPENDED').length;

      const formatOps = (list: any[]) => list.map((o, idx) => ({
        id: o.id,
        employeeId: `OPS-${new Date(o.createdAt).getFullYear()}-${o.id.slice(-4).toUpperCase()}`,
        name: o.profile?.fullName || (o.email ? o.email.split('@')[0] : `Operator ${idx + 1}`),
        role: o.email === 'admin@cybersave.com' ? 'Super Administrator' : 'Field Operator',
        department: o.profile?.district ? `${o.profile.district} Seva Kendra` : 'Operations',
        joinedDate: new Date(o.createdAt).toLocaleDateString('en-GB'),
        lastActive: 'Active recently',
        status: o.status === 'SUSPENDED' ? 'Suspended' : 'Active',
        permissions: Array.isArray(o.permissions) ? o.permissions : [],
        email: o.email || '',
        phone: o.phone || o.profile?.phone || '+91 98765 43210',
        avatarUrl: o.profile?.avatarUrl || '',
      }));

      const formattedOps = formatOps(ops);

      client.emit('response_operators_data', {
        stats: { totalOps, active, pending: 0, suspended },
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
      const finalPermissions = Array.from(new Set([...(Array.isArray(data.permissions) ? data.permissions : []), 'SETTINGS']));
      await this.prisma.user.update({
        where: { id: data.id },
        data: { permissions: finalPermissions },
      });
      client.emit('update_operator_access_success', {
        id: data.id,
        permissions: finalPermissions,
      });

      // Broadcast live permission update directly to all connected sockets
      AdminGateway.broadcast('operator_permissions_updated', {
        id: data.id,
        permissions: finalPermissions,
      });

      const ops = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
      });
      const formattedOps = ops.map((o, idx) => ({
        id: o.id,
        employeeId: `OPS-${new Date(o.createdAt).getFullYear()}-${o.id.slice(-4).toUpperCase()}`,
        name: o.profile?.fullName || (o.email ? o.email.split('@')[0] : `Operator ${idx + 1}`),
        role: o.email === 'admin@cybersave.com' ? 'Super Administrator' : 'Field Operator',
        department: o.profile?.district ? `${o.profile.district} Seva Kendra` : 'Operations',
        joinedDate: new Date(o.createdAt).toLocaleDateString('en-GB'),
        lastActive: 'Active recently',
        status: o.status === 'SUSPENDED' ? 'Suspended' : 'Active',
        permissions: Array.isArray(o.permissions) ? o.permissions : [],
        email: o.email || '',
        phone: o.phone || o.profile?.phone || '+91 98765 43210',
        avatarUrl: o.profile?.avatarUrl || '',
      }));
      this.server.emit('response_operators_data', {
        stats: { totalOps: ops.length, active: ops.filter(x => x.status !== 'SUSPENDED').length, pending: 0, suspended: ops.filter(x => x.status === 'SUSPENDED').length },
        operators: formattedOps,
      });
      AdminGateway.broadcast('operators_updated');
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
      department?: string;
    },
  ) {
    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(data.password || 'admin123', salt);

      const normalizedEmail = (data.email || '').trim().toLowerCase();
      const initialPermissions = Array.from(new Set([...(Array.isArray(data.permissions) && data.permissions.length > 0 ? data.permissions : ['DASHBOARD']), 'SETTINGS']));

      const newUser = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
          keycloakId: `op-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          role: 'ADMIN',
          passwordHash,
          permissions: initialPermissions,
          status: 'ACTIVE',
          profile: {
            create: {
              fullName: (data.name || '').trim(),
              district: data.department || 'Operations',
            },
          },
        },
      });
      client.emit('add_new_operator_success', newUser.id);
      const ops = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
      });
      const formattedOps = ops.map((o, idx) => ({
        id: o.id,
        employeeId: `OPS-${new Date(o.createdAt).getFullYear()}-${o.id.slice(-4).toUpperCase()}`,
        name: o.profile?.fullName || (o.email ? o.email.split('@')[0] : `Operator ${idx + 1}`),
        role: o.email === 'admin@cybersave.com' ? 'Super Administrator' : 'Field Operator',
        department: o.profile?.district ? `${o.profile.district} Seva Kendra` : 'Operations',
        joinedDate: new Date(o.createdAt).toLocaleDateString('en-GB'),
        lastActive: 'Active recently',
        status: o.status === 'SUSPENDED' ? 'Suspended' : 'Active',
        permissions: Array.isArray(o.permissions) ? o.permissions : [],
        email: o.email || '',
        phone: o.phone || o.profile?.phone || '+91 98765 43210',
        avatarUrl: o.profile?.avatarUrl || '',
      }));
      this.server.emit('response_operators_data', {
        stats: { totalOps: ops.length, active: ops.filter(x => x.status !== 'SUSPENDED').length, pending: 0, suspended: ops.filter(x => x.status === 'SUSPENDED').length },
        operators: formattedOps,
      });
      AdminGateway.broadcast('operators_updated');
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
        take: 200,
        include: { user: { include: { profile: true } } },
      });

      const loginActivities = await this.prisma.auditLog.count({
        where: {
          OR: [
            { action: { contains: 'LOGIN' } },
            { action: { contains: 'AUTH' } },
            { action: { contains: 'PASSWORD' } },
          ],
        },
      }).catch(() => 0);

      const documentActions = await this.prisma.auditLog.count({
        where: {
          OR: [
            { action: { contains: 'APPLICATION' } },
            { action: { contains: 'DOCUMENT' } },
            { action: { contains: 'APPROV' } },
            { action: { contains: 'REJECT' } },
            { action: { contains: 'SUBMIT' } },
          ],
        },
      }).catch(() => 0);

      const systemChanges = await this.prisma.auditLog.count({
        where: {
          OR: [
            { action: { contains: 'OPERATOR' } },
            { action: { contains: 'SERVICE' } },
            { action: { contains: 'SETTING' } },
            { action: { contains: 'ACCESS' } },
            { action: { contains: 'SECURITY' } },
          ],
        },
      }).catch(() => 0);

      const formatted = logs.map((l) => {
        let userName = l.user?.profile?.fullName || l.user?.email?.split('@')[0];
        if (!userName || userName === 'Administrator' || userName === 'Super Administrator') {
          const match = l.details?.match(/by (?:sub-admin \/ operator|sub-admin|operator|verification officer|officer) ([^.]+)/i);
          if (match && match[1]) {
            userName = match[1].trim();
          }
        }
        if (!userName) userName = l.user?.email ? l.user.email.split('@')[0] : 'Sub-Admin Operator';

        const act = (l.action || '').toUpperCase();
        let status = 'Success';
        if (act.includes('REJECT') || act.includes('FAIL') || act.includes('SUSPEND')) {
          status = 'Failed';
        } else if (act.includes('WARN') || act.includes('PENDING')) {
          status = 'Warning';
        }

        return {
          id: l.id,
          timestamp: l.createdAt.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
          }),
          isoTimestamp: l.createdAt.toISOString(),
          user: userName,
          userEmail: l.user?.email || '',
          action: l.action,
          resource: l.details || '-',
          ipAddress: l.ipAddress || '192.168.1.1',
          status,
        };
      });

      client.emit('response_audit_logs', {
        stats: {
          totalEvents: total,
          loginActivities,
          documentActions,
          systemChanges,
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

      let rawMessages: any[] = [];
      if (Array.isArray(foundTicket?.messages) && foundTicket.messages.length > 0) {
        rawMessages = foundTicket.messages;
      } else {
        rawMessages = [
          {
            id: `msg-${foundTicket?.id || '1'}`,
            senderId: reporterId,
            senderName: reporterName,
            role: 'USER',
            time: foundTicket ? foundTicket.createdAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '10:15 AM',
            text: ticketDesc,
            attachmentUrl: attachmentUrl,
          },
        ];
      }

      client.emit('response_ticket_thread', {
        id: foundTicket?.refNumber || ticketId || 'TKT-2024-001',
        title: ticketTitle,
        description: ticketDesc,
        attachmentUrl: attachmentUrl,
        category: foundTicket?.category || 'Technical Support',
        priority: foundTicket?.priority || 'Medium',
        status: foundTicket?.status || 'OPEN',
        createdOn: foundTicket ? foundTicket.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
        lastUpdated: foundTicket ? foundTicket.updatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
        assignedTo: { id: 'admin1', name: foundTicket?.assignedTo || 'Amit S. (Support Desk)' },
        reporter: { id: reporterId, name: reporterName },
        messages: rawMessages,
        notes: [
          {
            title: 'Ticket Active in Governance Queue',
            author: 'Support Automation Desk',
            time: foundTicket ? foundTicket.createdAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now',
            content: 'Customer issue logged and verified via Cloudinary for administrative response.',
          },
        ],
      });
    } catch (e) {
      console.error('[AdminGateway] request_ticket_thread error:', e);
    }
  }

  @SubscribeMessage('send_ticket_reply')
  async handleSendTicketReply(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string; text: string; adminId?: string; adminName?: string; adminRole?: string; adminEmail?: string },
  ) {
    try {
      const ticketId = data?.id;
      const text = data?.text;
      if (!ticketId || !text || !text.trim()) return;

      const isMongoId = (idStr?: string) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr);
      const orConditions: any[] = [{ refNumber: ticketId }, { refNumber: `TKT-${ticketId}` }];
      if (isMongoId(ticketId)) {
        orConditions.push({ id: ticketId });
      }

      const ticket = await this.prisma.supportTicket.findFirst({
        where: { OR: orConditions },
        include: { user: { include: { profile: true } } },
      });

      if (!ticket) return;

      const actingName = data.adminName || (data.adminEmail ? data.adminEmail.split('@')[0] : 'Support Officer (SDM)');
      const actingRole = data.adminRole || (data.adminEmail === 'admin@cybersave.com' ? 'Super Administrator' : 'Sub-Admin / Operator');
      const nowTimeStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

      const existingMsgs = Array.isArray(ticket.messages) ? (ticket.messages as any[]) : [];
      const replyMsg = {
        id: `msg-${Date.now()}`,
        senderId: data.adminId || 'admin',
        senderName: `${actingName} (${actingRole})`,
        role: 'AGENT',
        text: text.trim(),
        time: nowTimeStr,
      };

      const updatedMsgs = [...existingMsgs, replyMsg];

      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          messages: updatedMsgs as any,
          status: 'IN_PROGRESS',
          updatedAt: new Date(),
        },
      });

      // 1. Notify that specific user only
      if (ticket.userId) {
        await this.prisma.notification.create({
          data: {
            userId: ticket.userId,
            title: `Official Response on Ticket #${ticket.refNumber}`,
            body: text.length > 80 ? `${text.slice(0, 80)}...` : text,
            type: 'INFO',
            status: 'SENT',
          },
        }).catch(() => null);

        this.server.emit('user_grievance_reply', {
          userId: ticket.userId,
          userEmail: (ticket.user as any)?.email,
          userPhone: (ticket.user as any)?.phone,
          ticketId: ticket.refNumber,
          ticketTitle: ticket.title,
          message: replyMsg,
        });
      }

      // 2. Audit log
      await AdminGateway.logActivity(this.prisma, {
        userId: data.adminId,
        userEmail: data.adminEmail,
        userName: actingName,
        action: 'GRIEVANCE_REPLY_SENT',
        details: `Official response dispatched to citizen ${(ticket.user as any)?.profile?.fullName || ticket.user?.email || 'User'} on ticket #${ticket.refNumber}: "${text.slice(0, 70)}"`,
      });

      // 3. Broadcast updated thread
      this.server.emit('support_tickets_updated');
      this.server.emit('response_ticket_thread', {
        id: ticket.refNumber,
        title: ticket.title,
        description: ticket.description,
        attachmentUrl: ticket.attachmentUrl,
        category: ticket.category,
        priority: ticket.priority,
        status: 'IN_PROGRESS',
        createdOn: ticket.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        lastUpdated: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        assignedTo: { id: data.adminId || 'admin1', name: actingName },
        reporter: {
          id: ticket.userId || 'user1',
          name: (ticket.user as any)?.profile?.fullName || ticket.user?.email || 'Citizen User',
        },
        messages: updatedMsgs,
        notes: [],
      });
    } catch (e) {
      console.error('[AdminGateway] send_ticket_reply error:', e);
    }
  }

  @SubscribeMessage('request_operator_detail')
  async handleOperatorDetail(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string },
  ) {
    try {
      const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
      let o: any = null;

      if (isMongoId(data.id)) {
        o = await this.prisma.user.findUnique({
          where: { id: data.id },
          include: { profile: true, applications: true, documents: true, auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 } },
        });
      }

      if (!o && data.id?.startsWith('OPS-')) {
        const shortId = data.id.slice(-4).toUpperCase();
        const allOps = await this.prisma.user.findMany({
          where: { role: 'ADMIN' },
          include: { profile: true, applications: true, documents: true, auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 } },
        });
        o = allOps.find((x) => x.id.slice(-4).toUpperCase() === shortId) || null;
      }

      if (!o) {
        o = await this.prisma.user.findFirst({
          where: {
            OR: [{ id: data.id }, { email: data.id }, { role: 'ADMIN' }],
          },
          include: { profile: true, applications: true, documents: true, auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 } },
        });
      }

      if (!o) {
        client.emit('response_operator_detail', null);
        return;
      }

      const profile = o.profile || {};

      // 1. Calculate REAL tasks completed by this operator
      const tasksCompleted = await this.prisma.application.count({
        where: {
          OR: [
            { officialOfficer: profile.fullName || o.email },
            { userId: o.id },
          ],
        },
      }).catch(() => 0);

      // 2. Calculate REAL documents uploaded/processed by this operator
      const documentsProcessed = await this.prisma.documentUpload.count({
        where: { userId: o.id },
      }).catch(() => 0);

      // 3. Real audit logs for this operator only
      const logs = await this.prisma.auditLog.findMany({
        where: { userId: o.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }).catch(() => []);

      const activityLogs = logs.map((log: any) => ({
        id: log.id,
        dateTime: new Date(log.createdAt).toLocaleString('en-IN', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
        }),
        action: log.action,
        status: log.details === 'WARNING' ? 'WARNING' : log.details === 'ERROR' ? 'ERROR' : 'SUCCESS',
        ipAddress: log.ipAddress || '127.0.0.1',
      }));

      // 4. Real documents uploaded by this operator
      const rawDocs = await this.prisma.documentUpload.findMany({
        where: { userId: o.id },
        orderBy: { uploadedAt: 'desc' },
      }).catch(() => []);

      const formattedDocs = rawDocs.map((d: any, idx: number) => ({
        id: d.id,
        fileName: d.fileName || `Document_${idx + 1}`,
        refNum: `DOC-${d.id.slice(-4).toUpperCase()}`,
        type: (d.fileType || 'PDF').toUpperCase().includes('IMAGE') || (d.fileType || '').includes('PNG') || (d.fileType || '').includes('JPG') ? 'IMAGE' : 'PDF',
        status: 'Verified',
        fileSize: d.fileSize ? `${(d.fileSize / 1024 / 1024).toFixed(1)}` : '1.0',
        uploadedAt: new Date(d.uploadedAt || o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        expires: 'N/A',
        fileUrl: d.fileUrl || '',
      }));

      // 5. Supervisor
      const superAdmin = await this.prisma.user.findFirst({
        where: { role: 'ADMIN', email: 'admin@cybersave.com' },
        include: { profile: true },
      }).catch(() => null);

      const supervisorName = superAdmin?.profile?.fullName || (superAdmin?.email ? superAdmin.email.split('@')[0] : 'Super Administrator');

      const opData = {
        id: o.id,
        employeeId: `OPS-${new Date(o.createdAt).getFullYear()}-${o.id.slice(-4).toUpperCase()}`,
        name: profile.fullName || (o.email ? o.email.split('@')[0] : 'Operator'),
        status: o.status === 'SUSPENDED' ? 'Suspended' : (o.status === 'PENDING' ? 'Pending' : 'Active'),
        role: profile.dob ? 'Senior Field Operator' : 'Field Operator',
        department: profile.district ? 'Operations' : 'Administration',
        joinedDate: new Date(o.createdAt).toLocaleDateString('en-GB'),
        email: o.email || '',
        phone: o.phone || profile.phone || '',
        dob: profile.dob || '',
        address: profile.address || (profile.district ? `${profile.district}, ${profile.state || ''} - ${profile.pinCode || ''}` : ''),
        district: profile.district || '',
        state: profile.state || '',
        pinCode: profile.pinCode || '',
        twoFactorEnabled: false,
        lastLogin: o.updatedAt ? new Date(o.updatedAt).toLocaleString('en-IN', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
        }) : 'Never logged in',
        activeSessions: o.status === 'ACTIVE' ? '1 open session (Admin Portal / Chrome)' : '0 active sessions',
        ipWhitelisting: o.status === 'ACTIVE' ? 'Enabled (Corporate Subnet)' : 'Disabled',
        permissions: o.permissions && o.permissions.length > 0 ? o.permissions : ['DASHBOARD'],
        metrics: {
          tasksCompleted,
          tasksMom: tasksCompleted > 0 ? '+ 12% MoM' : '0% MoM',
          avgResponseTime: tasksCompleted > 0 ? '2.4 hrs' : '—',
          responseTier: tasksCompleted > 0 ? 'Top 5%' : 'Standard',
          satisfactionRating: tasksCompleted > 0 ? 4.8 : 0,
          documentsProcessed,
          accuracyRate: documentsProcessed > 0 ? '100% Accuracy' : '0% Accuracy',
        },
        reportingStructure: {
          supervisorName,
          supervisorRole: 'Direct Supervisor (Super Admin)',
          primaryShift: 'Day Shift (09:00 - 18:00)',
        },
        activityLogs,
        documents: formattedDocs,
      };

      client.emit('response_operator_detail', opData);
    } catch (e) {
      console.error('[AdminGateway] request_operator_detail error:', e);
      client.emit('response_operator_detail', null);
    }
  }

  @SubscribeMessage('update_operator_status')
  async handleUpdateOperatorStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string; status: string },
  ) {
    try {
      const targetStatus = (data.status || 'ACTIVE').toUpperCase();
      await this.prisma.user.update({
        where: { id: data.id },
        data: { status: targetStatus },
      });
      client.emit('update_operator_status_success', { id: data.id, status: targetStatus });
      AdminGateway.broadcast('operators_updated');
    } catch (e) {
      console.error('[AdminGateway] update_operator_status error:', e);
    }
  }

  @SubscribeMessage('reset_operator_password')
  async handleResetOperatorPassword(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string; password?: string },
  ) {
    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(data.password || 'Cybersave@2026', salt);
      await this.prisma.user.update({
        where: { id: data.id },
        data: { passwordHash },
      });
      client.emit('reset_operator_password_success', { id: data.id });
    } catch (e) {
      console.error('[AdminGateway] reset_operator_password error:', e);
    }
  }

  @SubscribeMessage('request_user_feedbacks')
  async handleRequestUserFeedbacks(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { userId?: string },
  ) {
    try {
      const whereClause = data?.userId ? { userId: data.userId } : {};
      const feedbacks = await (this.prisma as any).feedback.findMany({
        where: whereClause,
        include: { user: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      client.emit('response_user_feedbacks', feedbacks);
    } catch (e) {
      console.error('[AdminGateway] request_user_feedbacks error:', e);
    }
  }

  @SubscribeMessage('request_admin_profile')
  async handleRequestAdminProfile(@ConnectedSocket() client: Socket) {
    try {
      const settingsDoc = await this.prisma.systemSetting.findUnique({
        where: { key: 'admin_operational_settings' },
      }).catch(() => null);
      const extra = (settingsDoc?.value as any)?.profileExtra || {};

      const adminUser = await this.prisma.user.findFirst({
        where: { OR: [{ role: 'ADMIN' }, { email: 'admin@cybersave.com' }] },
        include: { profile: true },
      });

      const phone = extra.phone !== undefined && extra.phone !== null && extra.phone !== ''
        ? extra.phone
        : (adminUser?.phone || adminUser?.profile?.phone || '+91 98450 19823');

      const profile = {
        id: adminUser?.id || 'admin-root-01',
        name: extra.name || adminUser?.profile?.fullName || (adminUser?.email === 'admin@cybersave.com' ? 'Super Administrator' : 'Administrator'),
        email: extra.email || adminUser?.email || 'admin@cybersave.com',
        role: adminUser?.role === 'ADMIN' ? 'Super Admin' : 'Sub-Admin / Operator',
        phone,
        avatarUrl: extra.avatarUrl !== undefined ? extra.avatarUrl : (adminUser?.profile?.avatarUrl || ''),
        kendraId: extra.kendraId || 'CSC-DEL-8841',
        designation: extra.designation || 'Principal Verification Officer (SDM)',
        district: extra.district || adminUser?.profile?.district || 'Central Delhi, NCT of Delhi',
      };

      client.emit('response_admin_profile', profile);
    } catch (e) {
      console.error('[AdminGateway] request_admin_profile error:', e);
    }
  }

  @SubscribeMessage('update_admin_profile')
  async handleUpdateAdminProfile(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const { name, email, phone, avatarUrl, kendraId, designation, district } = data || {};
      const normalizedPhone = phone !== undefined && phone !== null ? String(phone).trim() : undefined;

      const allAdmins = await this.prisma.user.findMany({
        where: { OR: [{ role: 'ADMIN' }, { email: 'admin@cybersave.com' }] },
        include: { profile: true },
      });

      for (const adm of allAdmins) {
        await this.prisma.user.update({
          where: { id: adm.id },
          data: {
            phone: normalizedPhone !== undefined ? normalizedPhone : adm.phone,
          },
        }).catch(() => null);

        if (adm.profile) {
          await this.prisma.profile.update({
            where: { id: adm.profile.id },
            data: {
              fullName: name || adm.profile.fullName,
              phone: normalizedPhone !== undefined ? normalizedPhone : adm.profile.phone,
              district: district || adm.profile.district,
              avatarUrl: avatarUrl !== undefined ? avatarUrl : adm.profile.avatarUrl,
            },
          }).catch(() => null);
        } else {
          await this.prisma.profile.create({
            data: {
              userId: adm.id,
              fullName: name || 'Super Administrator',
              phone: normalizedPhone || '+91 98450 19823',
              district: district || 'Central Delhi, NCT of Delhi',
              avatarUrl: avatarUrl || '',
            },
          }).catch(() => null);
        }
      }

      const existingDoc = await this.prisma.systemSetting.findUnique({
        where: { key: 'admin_operational_settings' },
      }).catch(() => null);
      const existingVal = (existingDoc?.value as any) || {};

      const updatedProfileExtra = {
        name: name || existingVal.profileExtra?.name || 'Super Administrator',
        email: email || existingVal.profileExtra?.email || 'admin@cybersave.com',
        phone: normalizedPhone !== undefined ? normalizedPhone : (existingVal.profileExtra?.phone || '+91 98450 19823'),
        avatarUrl: avatarUrl !== undefined ? avatarUrl : (existingVal.profileExtra?.avatarUrl || ''),
        kendraId: kendraId || existingVal.profileExtra?.kendraId || 'CSC-DEL-8841',
        designation: designation || existingVal.profileExtra?.designation || 'Principal Verification Officer (SDM)',
        district: district || existingVal.profileExtra?.district || 'Central Delhi, NCT of Delhi',
      };

      await this.prisma.systemSetting.upsert({
        where: { key: 'admin_operational_settings' },
        update: {
          value: {
            ...existingVal,
            profileExtra: updatedProfileExtra,
          },
        },
        create: {
          key: 'admin_operational_settings',
          value: {
            profileExtra: updatedProfileExtra,
          },
        },
      }).catch(() => null);

      AdminGateway.broadcast('admin_profile_updated', updatedProfileExtra);
      client.emit('update_admin_profile_success', updatedProfileExtra);
    } catch (e) {
      console.error('[AdminGateway] update_admin_profile error:', e);
    }
  }
}
