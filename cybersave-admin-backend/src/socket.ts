import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { messaging } from './firebase';
import bcrypt from 'bcrypt';
import { findUserByIdOrCit, fetchCitizenFullDetails, fetchCitizensList, invalidateCitizensListCache, invalidateCitizenDetailsCache, fetchRealTransactionsData, performApplicationStatusUpdate, formatServiceResponse, processRefundApprovalOrRejection, createRefundAndSupportTicket, getOrCreateUserWallet } from './citizenService';

const prisma = new PrismaClient();

export const isRealOfficer = (off?: any): string => {
  if (!off || typeof off !== 'string') return '';
  const trimmed = off.trim();
  const placeholders = [
    'Officer Sharma (SDM)',
    'Officer Sharma',
    'Principal Verification Officer (SDM)',
    'Principal Verification Officer',
    'Verification Officer (SDM)',
    'Verification Officer',
    'Principal Officer',
    'Administrative Officer',
    'Auto Assigned',
    'Auto',
    'Unassigned',
    'SDM Delhi',
    'Vikram T.',
    'Sunita M.',
    'Deepak V.',
    'Rakesh S.'
  ];
  if (placeholders.some(p => p.toLowerCase() === trimmed.toLowerCase())) return '';
  return trimmed;
};

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
      documents: true,
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
        profile: { select: { fullName: true, phone: true, district: true, state: true, dob: true, gender: true, address: true, pinCode: true } },
      }
    });
    const userMap = new Map(users.map(u => [u.id, u]));
    for (const app of apps) {
      (app as any).user = userMap.get(app.userId) || null;
    }
  }

  return apps as any[];
}


export async function findSupportTicketOrLinked(idOrRef: string) {
  if (!idOrRef) return null;
  const cleanId = String(idOrRef).trim();
  const strippedId = cleanId.replace(/^(TKT|REF|FDB)-/i, '').trim();
  const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanId) || /^[0-9a-fA-F]{24}$/.test(strippedId);
  const targetMongo = /^[0-9a-fA-F]{24}$/.test(cleanId) ? cleanId : (/^[0-9a-fA-F]{24}$/.test(strippedId) ? strippedId : null);

  let ticket = null;
  if (targetMongo) {
    ticket = await prisma.supportTicket.findUnique({
      where: { id: targetMongo },
      include: { user: { include: { profile: true } } }
    });
  }
  if (!ticket) {
    ticket = await prisma.supportTicket.findFirst({
      where: {
        OR: [
          { refNumber: cleanId },
          { refNumber: `TKT-${strippedId}` },
          { refNumber: strippedId },
          { refNumber: { contains: strippedId, mode: 'insensitive' } },
          ...(isMongoId ? [{ id: cleanId }] : [])
        ]
      },
      include: { user: { include: { profile: true } } }
    });
  }

  // Fallback 1: If not in supportTicket, check if it's a RefundRequest
  if (!ticket) {
    const refund = await prisma.refundRequest.findFirst({
      where: {
        OR: [
          ...(isMongoId ? [{ id: cleanId }] : []),
          { refNumber: cleanId },
          { refNumber: { contains: strippedId, mode: 'insensitive' } }
        ]
      },
      include: { application: true, user: { include: { profile: true } } }
    });

    if (refund) {
      const refundRef = refund.refNumber || `REF-${refund.id.slice(-6)}`;
      ticket = await prisma.supportTicket.findFirst({
        where: {
          OR: [
            { refNumber: refundRef },
            { refNumber: cleanId }
          ]
        },
        include: { user: { include: { profile: true } } }
      });

      if (!ticket) {
        const reporterName = refund.user?.profile?.fullName || (refund.user?.email ? refund.user.email.split('@')[0] : 'Citizen Applicant');
        ticket = await prisma.supportTicket.create({
          data: {
            refNumber: refundRef,
            userId: refund.userId,
            title: `Refund Claim: ₹${refund.amount} - ${refund.serviceTitle || refund.application?.serviceTitle || 'Government Service Fee'}`,
            description: `Citizen requested refund for Application #${refund.application?.refNumber || 'N/A'}.\nReason: ${refund.reason}${refund.details ? '\nDetails: ' + refund.details : ''}`,
            category: 'Refund Request',
            priority: 'High',
            status: refund.status === 'APPROVED' || refund.status === 'REJECTED' ? 'RESOLVED' : 'IN_PROGRESS',
            attachmentUrl: refund.proofUrl || null,
            assignedTo: refund.adminNotes?.includes('Assigned to') ? refund.adminNotes : null,
            messages: [
              {
                id: `msg-refund-${refund.id}`,
                senderId: refund.userId || 'citizen',
                senderName: reporterName,
                role: 'CITIZEN',
                text: `Refund Request of ₹${refund.amount} submitted for Application #${refund.application?.refNumber || 'N/A'}.\n\nReason: ${refund.reason}${refund.details ? '\n\nDetails: ' + refund.details : ''}`,
                attachmentUrl: refund.proofUrl || null,
                time: refund.createdAt ? new Date(refund.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
                timestamp: refund.createdAt ? new Date(refund.createdAt).toISOString() : new Date().toISOString()
              }
            ]
          },
          include: { user: { include: { profile: true } } }
        });
      }
    }
  }

  // Fallback 2: If not in supportTicket or refund, check if it's Feedback
  if (!ticket) {
    const strippedFdb = cleanId.replace(/^FDB-/i, '').trim();
    let fb: any = null;
    if (isMongoId) {
      fb = await prisma.feedback.findUnique({
        where: { id: cleanId },
        include: { user: { include: { profile: true } } }
      });
    }
    if (!fb && /^[0-9a-fA-F]{24}$/.test(strippedFdb)) {
      fb = await prisma.feedback.findUnique({
        where: { id: strippedFdb },
        include: { user: { include: { profile: true } } }
      });
    }
    if (!fb) {
      const recentFbs = await prisma.feedback.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { user: { include: { profile: true } } }
      });
      fb = recentFbs.find((f: any) =>
        f.id.toUpperCase().endsWith(strippedFdb.toUpperCase()) ||
        f.id.toUpperCase().includes(strippedFdb.toUpperCase()) ||
        `FDB-${f.id.slice(-6).toUpperCase()}` === cleanId.toUpperCase()
      );
    }

    if (fb) {
      const fbRef = `FDB-${fb.id.slice(-6).toUpperCase()}`;
      ticket = await prisma.supportTicket.findFirst({
        where: {
          OR: [
            { refNumber: fbRef },
            { refNumber: cleanId }
          ]
        },
        include: { user: { include: { profile: true } } }
      });

      if (!ticket) {
        const reporterName = fb.user?.profile?.fullName || (fb.user?.email ? fb.user.email.split('@')[0] : 'Citizen User');
        ticket = await prisma.supportTicket.create({
          data: {
            refNumber: fbRef,
            userId: fb.userId,
            title: `Citizen Feedback (${fb.rating}★): ${fb.improvementCategory || 'App Experience'}`,
            description: `"${fb.feedbackText}"`,
            category: 'Citizen Feedback',
            priority: fb.rating <= 2 ? 'High' : (fb.rating === 3 ? 'Medium' : 'Low'),
            status: fb.rating <= 2 ? 'IN_PROGRESS' : 'RESOLVED',
            attachmentUrl: fb.imageUrl || null,
            messages: [
              {
                id: `msg-fb-${fb.id}`,
                senderId: fb.userId || 'citizen',
                senderName: reporterName,
                role: 'CITIZEN',
                text: `Rating: ${'★'.repeat(fb.rating)}${'☆'.repeat(Math.max(0, 5 - fb.rating))} (${fb.rating}/5)\nCategory: ${fb.improvementCategory || 'App Experience'}\n\nFeedback:\n"${fb.feedbackText}"`,
                attachmentUrl: fb.imageUrl || null,
                time: fb.createdAt ? new Date(fb.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
                timestamp: fb.createdAt ? new Date(fb.createdAt).toISOString() : new Date().toISOString()
              }
            ]
          },
          include: { user: { include: { profile: true } } }
        });
      }
    }
  }

  return ticket;
}

export async function formatSupportTicketThread(idOrRef: string) {
  if (!idOrRef) return null;
  const cleanId = String(idOrRef).trim();
  const strippedId = cleanId.replace(/^TKT-/i, '').trim();
  const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanId) || /^[0-9a-fA-F]{24}$/.test(strippedId);
  const targetMongo = /^[0-9a-fA-F]{24}$/.test(cleanId) ? cleanId : (/^[0-9a-fA-F]{24}$/.test(strippedId) ? strippedId : null);

  let ticket: any = null;
  if (targetMongo) {
    ticket = await prisma.supportTicket.findUnique({
      where: { id: targetMongo },
      include: { user: { include: { profile: true } } }
    });
  }
  if (!ticket) {
    ticket = await prisma.supportTicket.findFirst({
      where: {
        OR: [
          { refNumber: cleanId },
          { refNumber: `TKT-${strippedId}` },
          { refNumber: strippedId },
          { refNumber: { contains: strippedId, mode: 'insensitive' } }
        ]
      },
      include: { user: { include: { profile: true } } }
    });
  }

  // Fallback 1: If not in supportTicket, check if it's a RefundRequest
  if (!ticket) {
    const refund = await prisma.refundRequest.findFirst({
      where: {
        OR: [
          ...(isMongoId ? [{ id: cleanId }] : []),
          { refNumber: cleanId },
          { refNumber: { contains: strippedId, mode: 'insensitive' } }
        ]
      },
      include: { application: true, user: { include: { profile: true } } }
    });

    if (refund) {
      const reporterName = refund.user?.profile?.fullName || (refund.user?.email ? refund.user.email.split('@')[0] : 'Citizen Applicant');
      const reporterEmail = refund.user?.email || 'citizen@cybersave.gov.in';
      const reporterId = refund.user?.id || refund.userId || 'cit-user';
      const isApproved = refund.status === 'APPROVED';
      const isRejected = refund.status === 'REJECTED';

      return {
        id: refund.refNumber,
        rawId: refund.id,
        refNumber: refund.refNumber,
        title: `Refund Claim: ₹${refund.amount} - ${refund.serviceTitle || refund.application?.serviceTitle || 'Government Service Fee'}`,
        description: `Citizen requested refund for Application #${refund.application?.refNumber || 'N/A'}.\nReason: ${refund.reason}${refund.details ? '\nDetails: ' + refund.details : ''}`,
        category: 'Refund Request',
        priority: 'High',
        status: isApproved ? 'RESOLVED' : (isRejected ? 'RESOLVED' : 'OPEN'),
        createdOn: refund.createdAt ? new Date(refund.createdAt).toLocaleDateString('en-IN') : 'Today',
        lastUpdated: refund.updatedAt ? new Date(refund.updatedAt).toLocaleDateString('en-IN') : 'Today',
        createdAt: refund.createdAt,
        updatedAt: refund.updatedAt,
        attachmentUrl: refund.proofUrl || null,
        assignedTo: '',
        assignedOfficer: null,
        reporter: { id: reporterId, name: reporterName, email: reporterEmail, phone: refund.user?.phone || refund.user?.profile?.phone || '' },
        user: refund.user,
        refundAmount: refund.amount,
        refundStatus: refund.status,
        refundId: refund.id,
        applicationId: refund.applicationId,
        applicationRef: refund.application?.refNumber,
        serviceTitle: refund.serviceTitle || refund.application?.serviceTitle,
        messages: [
          {
            id: `msg-refund-${refund.id}`,
            senderId: reporterId,
            senderName: reporterName,
            role: 'CITIZEN',
            text: `Refund Request of ₹${refund.amount} submitted for Application #${refund.application?.refNumber || 'N/A'}.\n\nReason: ${refund.reason}${refund.details ? '\n\nDetails: ' + refund.details : ''}`,
            attachmentUrl: refund.proofUrl || null,
            time: refund.createdAt ? new Date(refund.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
            timestamp: refund.createdAt ? new Date(refund.createdAt).toISOString() : new Date().toISOString()
          },
          ...(isApproved ? [{
            id: `msg-appr-${refund.id}`,
            senderId: 'support-desk',
            senderName: 'Support Officer (SDM)',
            role: 'AGENT',
            text: `Refund Claim Approved! ₹${refund.amount} has been officially re-credited to citizen digital wallet. ✓`,
            time: refund.updatedAt ? new Date(refund.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            timestamp: refund.updatedAt ? new Date(refund.updatedAt).toISOString() : new Date().toISOString(),
            isResolution: true
          }] : []),
          ...(isRejected ? [{
            id: `msg-decl-${refund.id}`,
            senderId: 'support-desk',
            senderName: 'Support Officer (SDM)',
            role: 'AGENT',
            text: `Refund Claim Declined: ${refund.adminNotes || 'Declined by Administrator'}`,
            time: refund.updatedAt ? new Date(refund.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            timestamp: refund.updatedAt ? new Date(refund.updatedAt).toISOString() : new Date().toISOString(),
            isResolution: true
          }] : [])
        ],
        notes: [
          {
            title: 'Refund Claim Ingested',
            author: 'Financial Settlement Cell',
            content: `Claim for ₹${refund.amount} on Application #${refund.application?.refNumber || 'N/A'}. Reason: ${refund.reason}`,
            time: refund.createdAt ? new Date(refund.createdAt).toLocaleDateString('en-IN') : 'Recent'
          }
        ]
      };
    }

    // Fallback 2: If not in supportTicket, check if it's Feedback
    const strippedFdb = cleanId.replace(/^FDB-/i, '').trim();
    const fb = await prisma.feedback.findFirst({
      where: {
        OR: [
          ...(isMongoId ? [{ id: cleanId }] : []),
          { id: { contains: strippedFdb.toLowerCase(), mode: 'insensitive' } }
        ]
      },
      include: { user: { include: { profile: true } } }
    });

    if (fb) {
      const reporterName = fb.user?.profile?.fullName || (fb.user?.email ? fb.user.email.split('@')[0] : 'Citizen User');
      const reporterEmail = fb.user?.email || 'citizen@cybersave.gov.in';
      const reporterId = fb.user?.id || fb.userId || 'cit-user';
      return {
        id: `FDB-${fb.id.slice(-6).toUpperCase()}`,
        rawId: fb.id,
        refNumber: `FDB-${fb.id.slice(-6).toUpperCase()}`,
        title: `Citizen Feedback (${fb.rating}★): ${fb.improvementCategory || 'App Experience'}`,
        description: `"${fb.feedbackText}"`,
        category: 'Citizen Feedback',
        priority: fb.rating <= 2 ? 'High' : (fb.rating === 3 ? 'Medium' : 'Low'),
        status: fb.rating <= 2 ? 'OPEN' : 'RESOLVED',
        createdOn: fb.createdAt ? new Date(fb.createdAt).toLocaleDateString('en-IN') : 'Today',
        lastUpdated: fb.updatedAt ? new Date(fb.updatedAt).toLocaleDateString('en-IN') : 'Today',
        createdAt: fb.createdAt,
        updatedAt: fb.updatedAt,
        attachmentUrl: fb.imageUrl || null,
        assignedTo: '',
        assignedOfficer: null,
        reporter: { id: reporterId, name: reporterName, email: reporterEmail, phone: fb.user?.phone || fb.user?.profile?.phone || '' },
        user: fb.user,
        rating: fb.rating,
        feedbackCategory: fb.improvementCategory,
        messages: [
          {
            id: `msg-fb-${fb.id}`,
            senderId: reporterId,
            senderName: reporterName,
            role: 'CITIZEN',
            text: `Rating: ${'★'.repeat(fb.rating)}${'☆'.repeat(Math.max(0, 5 - fb.rating))} (${fb.rating}/5)\nCategory: ${fb.improvementCategory || 'App Experience'}\n\nFeedback:\n"${fb.feedbackText}"`,
            attachmentUrl: fb.imageUrl || null,
            time: fb.createdAt ? new Date(fb.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
            timestamp: fb.createdAt ? new Date(fb.createdAt).toISOString() : new Date().toISOString()
          }
        ],
        notes: [
          {
            title: 'Citizen Mobile Feedback Ingested',
            author: 'Mobile App Gateway',
            content: `Submitted ${fb.rating}-star review for category "${fb.improvementCategory || 'App Experience'}".`,
            time: fb.createdAt ? new Date(fb.createdAt).toLocaleDateString('en-IN') : 'Recent'
          }
        ]
      };
    }

    return null;
  }

  // If ticket exists, enrich with linked Refund or Feedback metadata if applicable
  let extraRefundData: any = {};
  if (ticket.category === 'Refund Request' || ticket.refNumber?.startsWith('REF-') || ticket.title?.includes('Refund')) {
    const linkedRefund = await prisma.refundRequest.findFirst({
      where: {
        OR: [
          { refNumber: ticket.refNumber },
          { id: ticket.id },
          { refNumber: { contains: strippedId, mode: 'insensitive' } }
        ]
      },
      include: { application: true }
    });
    if (linkedRefund) {
      extraRefundData = {
        refundAmount: linkedRefund.amount,
        refundStatus: linkedRefund.status,
        refundId: linkedRefund.id,
        applicationId: linkedRefund.applicationId,
        applicationRef: linkedRefund.application?.refNumber,
        serviceTitle: linkedRefund.serviceTitle || linkedRefund.application?.serviceTitle,
        attachmentUrl: ticket.attachmentUrl || linkedRefund.proofUrl || null
      };
    }
  } else if (ticket.category === 'Citizen Feedback' || ticket.refNumber?.startsWith('FDB-') || ticket.title?.includes('Feedback')) {
    const titleMatch = ticket.title?.match(/\((\d)★\)/);
    const parsedStar = titleMatch && titleMatch[1] ? parseInt(titleMatch[1], 10) : undefined;
    const fdbSuffix = (ticket.refNumber || '').replace(/^FDB-/i, '').toLowerCase();

    let linkedFb: any = null;
    try {
      const fbWhere: any = {};
      const fbOr: any[] = [];
      if (ticket.userId && /^[0-9a-fA-F]{24}$/.test(String(ticket.userId))) {
        fbOr.push({ userId: String(ticket.userId) });
      }
      if (fbOr.length > 0) {
        fbWhere.OR = fbOr;
        linkedFb = await prisma.feedback.findFirst({
          where: fbWhere,
          orderBy: { createdAt: 'desc' }
        });
      }
      if (!linkedFb && fdbSuffix) {
        const allFb = await prisma.feedback.findMany({ take: 20, orderBy: { createdAt: 'desc' } });
        linkedFb = allFb.find(f => f.id.toLowerCase().endsWith(fdbSuffix));
      }
    } catch (_) {}


    const realRating = linkedFb?.rating ?? parsedStar ?? 5;
    extraRefundData = {
      rating: realRating,
      feedbackCategory: linkedFb?.improvementCategory || (ticket.title?.includes(':') ? ticket.title.split(':').slice(1).join(':').trim() : 'App Experience'),
      attachmentUrl: ticket.attachmentUrl || linkedFb?.imageUrl || null
    };
  }


  const reporterName = ticket.user?.profile?.fullName || (ticket.user?.email ? ticket.user.email.split('@')[0] : 'Citizen Applicant');
  const reporterEmail = ticket.user?.email || 'citizen@cybersave.gov.in';
  const reporterId = ticket.user?.id || ticket.userId || 'cit-user';

  const defaultMsg = {
    id: `msg-initial-${ticket.id}`,
    senderId: reporterId,
    senderName: reporterName,
    role: 'CITIZEN',
    text: ticket.description || ticket.title || 'Citizen submitted grievance request regarding service application.',
    time: ticket.createdAt ? new Date(ticket.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '10:30 AM',
    timestamp: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : new Date().toISOString(),
    attachmentUrl: ticket.attachmentUrl || extraRefundData.attachmentUrl || null
  };

  const rawMessages = Array.isArray(ticket.messages) ? ticket.messages : [];
  const normalizedMessages = rawMessages.map((m: any, idx: number) => {
    const isAgent = m.role === 'AGENT' || m.role === 'OFFICIAL';
    return {
      id: m.id || `msg-${idx}-${Date.now()}`,
      senderId: m.senderId || (isAgent ? 'support-desk' : reporterId),
      senderName: m.senderName || m.sender || (isAgent ? 'Support Desk Officer' : reporterName),
      role: m.role || (isAgent ? 'AGENT' : 'CITIZEN'),
      text: m.text || m.message || m.content || '',
      attachmentUrl: m.attachmentUrl || null,
      time: m.time || (m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recent'),
      timestamp: m.timestamp || new Date().toISOString(),
      isResolution: Boolean(m.isResolution || (m.text && m.text.includes('marked as RESOLVED')))
    };
  });

  const messages = normalizedMessages.length > 0 ? normalizedMessages : [defaultMsg];

  const notes = [
    {
      title: ticket.category === 'Refund Request' ? 'Refund Claim Triaged' : 'Citizen Grievance Ingested',
      author: 'Portal Triaging Engine',
      content: ticket.category === 'Refund Request' 
        ? `Refund claim for Application #${extraRefundData.applicationRef || 'N/A'} routed to administrative audit.`
        : 'Ticket auto-routed to Sub-Divisional Magistrate (SDM) citizen grievance cell for fast resolution.',
      time: ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-IN') : 'Recent'
    }
  ];

  const assignedName = typeof ticket.assignedTo === 'string' && ticket.assignedTo.trim() ? ticket.assignedTo : '';

  return {
    id: ticket.refNumber || `TKT-${ticket.id.substring(0, 8).toUpperCase()}`,
    rawId: ticket.id,
    refNumber: ticket.refNumber,
    title: ticket.title || 'Citizen Grievance Support',
    description: ticket.description || 'Support inquiry registered by citizen',
    category: ticket.category || 'Technical Support',
    priority: ticket.priority || 'Medium',
    status: ticket.status || 'OPEN',
    createdOn: ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-IN') : 'Today',
    lastUpdated: ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString('en-IN') : 'Today',
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    attachmentUrl: ticket.attachmentUrl || extraRefundData.attachmentUrl || null,
    assignedTo: assignedName,
    assignedOfficer: assignedName ? { id: 'agent-01', name: assignedName } : null,
    reporter: { id: reporterId, name: reporterName, email: reporterEmail, phone: ticket.user?.phone || ticket.user?.profile?.phone || '' },
    user: ticket.user,
    messages,
    notes,
    ...extraRefundData
  };
}

export async function resolveTicketTargetUserId(ticket: any): Promise<string | null> {
  if (!ticket) return null;
  if (ticket.userId && /^[0-9a-fA-F]{24}$/.test(String(ticket.userId))) {
    return String(ticket.userId);
  }
  if (ticket.user?.id && /^[0-9a-fA-F]{24}$/.test(String(ticket.user.id))) {
    return String(ticket.user.id);
  }
  // Check messages for a citizen/user sender ID
  if (Array.isArray(ticket.messages)) {
    for (const msg of ticket.messages) {
      if ((msg.role === 'USER' || msg.role === 'CITIZEN') && msg.senderId && /^[0-9a-fA-F]{24}$/.test(String(msg.senderId))) {
        return String(msg.senderId);
      }
    }
  }
  // Check reporter field if string or object
  if (ticket.reporter) {
    const repStr = typeof ticket.reporter === 'object' ? (ticket.reporter.id || ticket.reporter.email) : String(ticket.reporter);
    if (repStr && /^[0-9a-fA-F]{24}$/.test(repStr)) {
      return repStr;
    }
    if (repStr) {
      const foundUser = await prisma.user.findFirst({
        where: { OR: [{ email: repStr }, { phone: repStr }] }
      }).catch(() => null);
      if (foundUser) return foundUser.id;
    }
  }
  // Fallback to active citizen user
  const defaultCitizen = await prisma.user.findFirst({
    where: { role: 'USER' },
    orderBy: { updatedAt: 'desc' }
  }).catch(() => null);
  return defaultCitizen ? defaultCitizen.id : null;
}

export async function dispatchNotificationToCitizen(params: {
  userId?: string | null;
  title: string;
  body: string;
  type?: 'APPLICATION_UPDATE' | 'PAYMENT' | 'SYSTEM' | 'SECURITY' | 'WARNING' | 'SUCCESS' | 'INFO';
  metadata?: any;
  io?: any;
}) {
  const { userId, title, body, type = 'APPLICATION_UPDATE', metadata, io } = params;
  let targetUserId = userId;

  if (targetUserId) {
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(targetUserId);
    if (!isMongoId) {
      const u = await findUserByIdOrCit(targetUserId);
      if (u) targetUserId = u.id;
    }
  }

  let createdNotification: any = null;
  if (targetUserId && /^[0-9a-fA-F]{24}$/.test(targetUserId)) {
    try {
      createdNotification = await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: title || 'Cybersave Notification',
          body: body || '',
          type: (type as any) || 'APPLICATION_UPDATE',
          status: 'SENT',
          sentAt: new Date(),
        }
      });
    } catch (e) {
      console.warn('[dispatchNotificationToCitizen] DB creation note:', e);
    }
  }

  const notificationPayload = {
    id: createdNotification?.id || `notif_${Date.now()}`,
    userId: targetUserId || 'all',
    title,
    body,
    type,
    metadata: metadata || {},
    status: 'SENT',
    createdAt: new Date().toISOString(),
  };

  // Broadcast through active socket server
  const broadcastIo = io || (global as any).__cybersave_io;
  if (broadcastIo) {
    broadcastIo.emit('user_push_notification', notificationPayload);
    broadcastIo.emit('new_notification', notificationPayload);
    broadcastIo.emit('notifications_updated', notificationPayload);
  }

  // Attempt Firebase FCM Push Notification if token exists
  if (targetUserId && /^[0-9a-fA-F]{24}$/.test(targetUserId)) {
    try {
      const user = await prisma.user.findUnique({ where: { id: targetUserId }, select: { fcmToken: true } });
      if (user?.fcmToken && messaging) {
        await messaging.send({
          token: user.fcmToken,
          notification: {
            title,
            body,
          },
          data: {
            title,
            body,
            type: String(type),
            metadata: JSON.stringify(metadata || {}),
          },
        }).catch((err: any) => console.warn('[FCM Send Error]:', err?.message));
      }
    } catch (err) {
      console.warn('[FCM Notification Exception]:', err);
    }
  }

  return notificationPayload;
}

// In-memory caching for socket queries accessible across modules
export const socketOperatorCache = new Map<string, { data: any; timestamp: number }>();
export let socketOperatorsListCache: { data: any; timestamp: number } | null = null;
export let socketAuditLogsCache: { data: any; timestamp: number } | null = null;

export function invalidateSocketOperatorCache(id?: string) {
  if (id) {
    socketOperatorCache.delete(id);
    socketOperatorCache.delete(`op-${id}`);
  } else {
    socketOperatorCache.clear();
  }
}

export function setupSockets(io: Server) {
  (global as any).__cybersave_io = io;

  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    let currentUserId: string | null = null;

    // Mobile presence and token registration
    socket.on('user_connected', async (data: { userId: string; fcmToken?: string }) => {
      try {
        if (!data || !data.userId) return;
        const uid = String(data.userId).trim();
        currentUserId = uid;
        socket.join(uid);
        socket.join('citizens');
        socket.join('all');
        if (/^[0-9a-fA-F]{24}$/.test(uid)) {
          await prisma.user.update({
            where: { id: uid },
            data: {
              isOnline: true,
              lastSeenAt: new Date(),
              ...(data.fcmToken ? { fcmToken: data.fcmToken } : {})
            }
          }).catch(() => null);
        }
        io.emit('citizen_presence_updated', { userId: uid, isOnline: true, lastSeenAt: new Date() });
        io.emit('user_status_changed', { userId: uid, isOnline: true, lastSeenAt: new Date() });
      } catch (err) {
        console.warn('[user_connected socket error]:', err);
      }
    });

    socket.on('disconnect', async () => {
      try {
        if (currentUserId && /^[0-9a-fA-F]{24}$/.test(currentUserId)) {
          await prisma.user.update({
            where: { id: currentUserId },
            data: { isOnline: false, lastSeenAt: new Date() }
          }).catch(() => null);
          io.emit('citizen_presence_updated', { userId: currentUserId, isOnline: false, lastSeenAt: new Date() });
          io.emit('user_status_changed', { userId: currentUserId, isOnline: false, lastSeenAt: new Date() });
        }
      } catch (_) {}
    });

    socket.on('citizen_heartbeat', async (data: { userId: string }) => {
      try {
        if (!data?.userId || !/^[0-9a-fA-F]{24}$/.test(data.userId)) return;
        await prisma.user.update({
          where: { id: data.userId },
          data: { isOnline: true, lastSeenAt: new Date() }
        }).catch(() => null);
        io.emit('citizen_presence_updated', { userId: data.userId, isOnline: true, lastSeenAt: new Date() });
        io.emit('user_status_changed', { userId: data.userId, isOnline: true, lastSeenAt: new Date() });
      } catch (_) {}
    });

    socket.on('user_disconnected', async (data: { userId: string }) => {
      try {
        if (!data?.userId || !/^[0-9a-fA-F]{24}$/.test(data.userId)) return;
        await prisma.user.update({
          where: { id: data.userId },
          data: { isOnline: false, lastSeenAt: new Date() }
        }).catch(() => null);
        io.emit('citizen_presence_updated', { userId: data.userId, isOnline: false, lastSeenAt: new Date() });
        io.emit('user_status_changed', { userId: data.userId, isOnline: false, lastSeenAt: new Date() });
      } catch (_) {}
    });

    socket.on('citizen_app_closed', async (data: { userId: string }) => {
      try {
        if (!data?.userId || !/^[0-9a-fA-F]{24}$/.test(data.userId)) return;
        await prisma.user.update({
          where: { id: data.userId },
          data: { isOnline: false, lastSeenAt: new Date() }
        }).catch(() => null);
        io.emit('citizen_presence_updated', { userId: data.userId, isOnline: false, lastSeenAt: new Date() });
        io.emit('user_status_changed', { userId: data.userId, isOnline: false, lastSeenAt: new Date() });
      } catch (_) {}
    });

    // Provide real-time data via websockets
    socket.on('request_dashboard_data', async () => {
      try {
        if ((global as any).__buildDashboardData) {
          const payload = await (global as any).__buildDashboardData();
          socket.emit('response_dashboard_data', payload);
          return;
        }
        const today = new Date(); today.setHours(0,0,0,0);
        
        // Execute all dashboard queries in parallel to drastically cut response time
        const [
          totalApps,
          pendingApps,
          completedAppsTodayCount,
          rejectedAppsTodayCount,
          totalApprovedApps,
          totalRejectedApps,
          appsTodayCount,
          allApps,
          totalCitizens,
          activeCentres,
          totalRefunds,
          approvedRefunds,
          auditLogs,
          realTxnData
        ] = await Promise.all([
          prisma.application.count(),
          prisma.application.count({ 
            where: { status: { in: ['SUBMITTED', 'VERIFYING', 'PENDING'] } } 
          }),
          prisma.application.count({ 
            where: { 
              status: { in: ['APPROVED', 'COMPLETED'] },
              updatedAt: { gte: today }
            } 
          }),
          prisma.application.count({ 
            where: { 
              status: 'REJECTED',
              updatedAt: { gte: today }
            } 
          }),
          prisma.application.count({ 
            where: { status: { in: ['APPROVED', 'COMPLETED'] } } 
          }),
          prisma.application.count({ 
            where: { status: 'REJECTED' } 
          }),
          prisma.application.count({ where: { submittedAt: { gte: today } } }),
          fetchApplicationsWithUsers({}, 100),
          prisma.user.count({ where: { role: 'USER' } }),
          prisma.user.count({ where: { role: 'ADMIN' } }),
          prisma.refundRequest.count(),
          prisma.refundRequest.findMany({ where: { status: 'APPROVED' }, select: { amount: true } }),
          prisma.auditLog.findMany({
            take: 8,
            orderBy: { createdAt: 'desc' },
            include: { user: { include: { profile: true } } }
          }),
          fetchRealTransactionsData()
        ]);

        const appsToday = appsTodayCount > 0 ? appsTodayCount : allApps.filter(a => new Date(a.submittedAt) >= today).length;
        
        // Exact real-time daily realized revenue and lifetime net collections from settlement ledger
        const revenueToday = realTxnData.stats.revenueToday; // Exactly ₹1,736.00
        const totalRevenue = realTxnData.stats.totalAmount; // Exactly ₹8,029.00
        const todayGross = realTxnData.stats.todayGross;
        const refundedToday = realTxnData.stats.todayRefunds;
        const totalRefundedAmount = realTxnData.stats.refundedAmount; // Exactly ₹227.00
        const totalTransactionsCount = realTxnData.transactions.length; // Exactly 18

        // Calculate service distribution
        const serviceCounts: Record<string, number> = {};
        allApps.forEach(a => {
          const title = a.serviceTitle || a.service?.title || 'Other Services';
          serviceCounts[title] = (serviceCounts[title] || 0) + 1;
        });
        const serviceShare = Object.entries(serviceCounts).map(([name, count]) => ({
          name,
          percentage: totalApps > 0 ? Math.round((count / totalApps) * 100) : 0,
          count
        })).sort((a, b) => b.percentage - a.percentage);

        // Build 7-day revenue overview & application trends directly from genuine daily settlement breakdown
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const revenueOverview = [];
        const applicationTrends = [];

        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateYMD = d.toISOString().slice(0, 10);
          d.setHours(0, 0, 0, 0);
          const nextD = new Date(d);
          nextD.setDate(nextD.getDate() + 1);

          const dayApps = allApps.filter(a => {
            const at = new Date(a.submittedAt);
            return at >= d && at < nextD;
          });

          const dayLabel = daysOfWeek[d.getDay()];
          const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          
          // Match settlement journal daily breakdown net revenue
          const breakdownEntry = realTxnData.stats.dailyBreakdown?.[dateYMD];
          const dayRev = breakdownEntry ? breakdownEntry.net : dayApps.reduce((sum, a) => sum + (a.feePaid || 50), 0);
          
          const dayApproved = dayApps.filter(a => a.status === 'APPROVED' || a.status === 'COMPLETED').length;
          const dayPending = dayApps.filter(a => ['SUBMITTED', 'VERIFYING', 'PENDING'].includes(a.status)).length;
          const dayRejected = dayApps.filter(a => a.status === 'REJECTED').length;

          revenueOverview.push({
            day: dayLabel,
            date: dateStr,
            value: dayRev,
            revenue: dayRev
          });

          applicationTrends.push({
            day: dayLabel,
            date: dateStr,
            approved: dayApproved,
            completed: dayApproved,
            pending: dayPending,
            rejected: dayRejected
          });
        }

        const operatorLogs = auditLogs.map(l => {
          const act = (l.action || '').toLowerCase();
          const isApproved = act.includes('approve');
          const isRejected = act.includes('reject');
          const isWallet = act.includes('wallet') || act.includes('payment');
          const isTicket = act.includes('ticket');
          const type = isApproved ? 'approved' : isRejected ? 'rejected' : isWallet ? 'wallet' : isTicket ? 'ticket' : 'operator';
          return {
            id: l.id,
            type,
            title: l.action.replace(/_/g, ' '),
            description: l.details || (l.user?.profile?.fullName ? `Action by ${l.user.profile.fullName}` : `System operation recorded`),
            time: new Date(l.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: l.createdAt.toISOString()
          };
        });

        const recentAppsFormatted = allApps.slice(0, 15).map((app: any) => {
          const citizenName = app.user?.profile?.fullName || app.formData?.fullName || app.user?.phone || 'Citizen Applicant';
          const cleanRef = app.refNumber || `CS-2026-${app.id.substring(0, 4).toUpperCase()}`;
          return {
            id: cleanRef,
            refNumber: cleanRef,
            citizenName,
            service: app.serviceTitle || 'Government Service Clearance',
            status: app.status === 'SUBMITTED' ? 'In Review' : 
                    app.status === 'VERIFYING' ? 'Pending' :
                    app.status === 'APPROVED' ? 'Completed' :
                    app.status === 'REJECTED' ? 'Rejected' : app.status,
            rawStatus: app.status,
            feeAmount: app.feePaid !== undefined ? app.feePaid : 50,
            dateSubmitted: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Today',
            rawApp: app
          };
        });

        socket.emit('response_dashboard_data', {
          stats: {
            revenueToday,
            todayGross,
            totalRevenue,
            grossInflow: realTxnData.stats.grossInflow,
            appsToday,
            totalApps,
            pendingApps,
            totalApproved: totalApprovedApps,
            approvedApps: totalApprovedApps,
            completedAppsToday: completedAppsTodayCount,
            approvedToday: completedAppsTodayCount,
            rejectedAppsToday: rejectedAppsTodayCount,
            rejectedToday: rejectedAppsTodayCount,
            totalRejected: totalRejectedApps,
            totalCitizens,
            activeCentres,
            totalRefunds,
            refundedToday,
            totalRefundedAmount,
            totalTransactionsCount,
            dailyBreakdown: realTxnData.stats.dailyBreakdown
          },
          transactions: realTxnData.transactions,
          collections: {
            totalCollectionsToday: revenueToday,
            totalCollections: revenueToday,
            totalLifetime: totalRevenue,
            onlinePayments: revenueToday,
            cashCollections: 0,
            onlinePercentage: revenueToday > 0 ? 100 : 0,
            cashPercentage: 0,
            netToday: revenueToday,
            netLifetime: totalRevenue,
          },
          serviceShare: serviceShare.length > 0 ? serviceShare : [
            { name: 'Aadhaar Update', percentage: 35 },
            { name: 'PAN Card', percentage: 25 },
            { name: 'Certificates', percentage: 20 },
            { name: 'Income Certificate', percentage: 20 }
          ],
          operatorLogs,
          recentApps: recentAppsFormatted,
          charts: {
            revenueOverview,
            applicationTrends
          }
        });
      } catch (e) {
        console.error('[Socket] request_dashboard_data error:', e);
      }
    });

    socket.on('request_refunds_data', async () => {
      try {
        const refunds = await prisma.refundRequest.findMany({
          take: 100,
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
          }
        });
        socket.emit('response_refunds_data', refunds);
      } catch (e) {
        console.error('[Socket] request_refunds_data error:', e);
      }
    });

    socket.on('request_users_data', async (params?: { page?: number; limit?: number }) => {
      try {
        const usersData = await fetchCitizensList(params);
        socket.emit('response_users_data', usersData);
      } catch (e) {
        console.error('[Socket] request_users_data error:', e);
      }
    });

    socket.on('request_user_detail', async (data: { id: string }) => {
      try {
        const realId = data?.id;
        const details = await fetchCitizenFullDetails(realId);
        if (!details) {
          socket.emit('response_user_detail', { error: 'User not found' });
          return;
        }
        socket.emit('response_user_detail', details);
      } catch (e) {
        console.error('[Socket] request_user_detail error:', e);
      }
    });

    socket.on('add_citizen', async (data: { name: string; phone?: string; district?: string }) => {
      try {
        const { name, phone, district } = data;
        const cleanName = (name || '').trim();
        if (!cleanName) return;

        const newUser = await prisma.user.create({
          data: {
            phone: phone || null,
            role: 'USER',
            status: 'ACTIVE',
            profile: {
              create: {
                fullName: cleanName,
                phone: phone || null,
                district: district || 'Central District',
              }
            }
          }
        });

        await prisma.auditLog.create({
          data: {
            userId: newUser.id,
            action: 'CITIZEN_ENROLLED',
            details: `Citizen ${cleanName} enrolled into directory`,
          }
        }).catch(() => null);

        socket.emit('add_citizen_success', { id: newUser.id });
        const usersData = await fetchCitizensList();
        io.emit('response_users_data', usersData);
      } catch (err: any) {
        console.error('[Socket] add_citizen error:', err);
      }
    });

    socket.on('update_citizen_profile', async (data: any) => {
      try {
        const { id, fullName, phone, email, address, district, state, pinCode, dob, gender, status } = data;
        let u = await findUserByIdOrCit(id);

        if (!u) {
          socket.emit('update_citizen_error', { message: 'Citizen not found' });
          return;
        }

        await prisma.user.update({
          where: { id: u.id },
          data: {
            email: email || u.email,
            phone: phone || u.phone,
            status: status || u.status,
          },
        });

        const existingProf = await prisma.profile.findFirst({ where: { userId: u.id } });
        if (existingProf) {
          await prisma.profile.update({
            where: { id: existingProf.id },
            data: {
              fullName: fullName ?? existingProf.fullName,
              phone: phone ?? existingProf.phone,
              email: email ?? existingProf.email,
              address: address ?? existingProf.address,
              district: district ?? existingProf.district,
              state: state ?? existingProf.state,
              pinCode: pinCode ?? existingProf.pinCode,
              dob: dob ?? existingProf.dob,
              gender: gender ?? existingProf.gender,
            },
          });
        } else {
          await prisma.profile.create({
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

        await prisma.auditLog.create({
          data: {
            userId: u.id,
            action: 'CITIZEN_PROFILE_UPDATED',
            details: `Admin updated citizen profile information`,
          },
        }).catch(() => null);

        const formatted = await fetchCitizenFullDetails(u.id);
        socket.emit('update_citizen_success', formatted);
        io.emit('response_user_detail', formatted);
        io.emit('user_detail_updated', formatted);
        
        // Also refresh list
        const usersData = await fetchCitizensList();
        io.emit('response_users_data', usersData);
      } catch (e: any) {
        console.error('[Socket] update_citizen_profile error:', e);
        socket.emit('update_citizen_error', { message: e.message });
      }
    });

    socket.on('block_citizen', async (data: { id: string, status?: string }) => {
      try {
        let u = await findUserByIdOrCit(data.id);

        if (!u) {
          console.error(`[block_citizen] User not found: ${data.id}`);
          return;
        }

        const nextStatus = data.status 
          ? (String(data.status).toUpperCase() === 'BLOCKED' ? 'BLOCKED' : 'VERIFIED')
          : (u.status === 'BLOCKED' ? 'VERIFIED' : 'BLOCKED');

        await prisma.user.update({
          where: { id: u.id },
          data: { status: nextStatus }
        });

        invalidateCitizensListCache();
        invalidateCitizenDetailsCache(u.id);

        if (nextStatus === 'BLOCKED') {
          await dispatchNotificationToCitizen({
            userId: u.id,
            title: 'Account Blocked by Administrator ⚠️',
            body: 'Your Cybersave citizen account has been blocked by the administrative authority. Please contact support.',
            type: 'WARNING',
            io
          }).catch(() => null);

          io.emit('force_logout', { userId: u.id, reason: 'Your account has been suspended/blocked by an Administrator. Please contact support.' });
          io.emit('user_blocked', { userId: u.id });
        }

        await prisma.auditLog.create({
          data: {
            userId: u.id,
            action: nextStatus === 'BLOCKED' ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
            details: `Admin changed citizen status to ${nextStatus}. ${nextStatus === 'BLOCKED' ? 'Immediate force logout and suspension enforced.' : 'Citizen unblocked.'}`
          }
        }).catch(() => null);

        io.emit('audit_logs_updated');
        io.emit('citizen_status_updated', { id: u.id, status: nextStatus });

        const formatted = await fetchCitizenFullDetails(u.id);
        socket.emit('block_citizen_success', formatted);
        io.emit('response_user_detail', formatted);
        io.emit('user_detail_updated', formatted);

        // Also refresh list
        const usersData = await fetchCitizensList();
        io.emit('response_users_data', usersData);
      } catch (e) {
        console.error('[block_citizen] error:', e);
      }
    });

    socket.on('bulk_block_citizens', async (data: { userIds: string[]; status?: string }) => {
      try {
        const { userIds = [], status = 'BLOCKED' } = data;
        if (!Array.isArray(userIds) || userIds.length === 0) return;

        const isMongo = (idStr?: any) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr.trim());
        const mongoIds = userIds.filter(isMongo);
        const nonMongo = userIds.filter(id => !isMongo(id));

        const orConditions: any[] = [];
        if (mongoIds.length > 0) orConditions.push({ id: { in: mongoIds } });
        if (nonMongo.length > 0) orConditions.push({ email: { in: nonMongo } });

        const updated = await prisma.user.updateMany({
          where: { OR: orConditions },
          data: { status }
        });

        if (status === 'BLOCKED') {
          for (const uid of mongoIds) {
            dispatchNotificationToCitizen({
              userId: uid,
              title: 'Account Blocked by Administrator ⚠️',
              body: 'Your Cybersave citizen account has been blocked by the administrative authority. Please contact support.',
              type: 'WARNING',
              io
            }).catch(() => null);
            io.emit('force_logout', { userId: uid, reason: 'Your account has been suspended/blocked by an Administrator. Please contact support.' });
            io.emit('user_blocked', { userId: uid });
            invalidateCitizenDetailsCache(uid);
          }
        }

        await prisma.auditLog.create({
          data: {
            userId: 'admin_action',
            action: status === 'BLOCKED' ? 'USERS_BULK_BLOCKED' : 'USERS_BULK_STATUS_CHANGED',
            details: `Batch changed status to ${status} for ${updated.count} citizen(s)`,
          }
        }).catch(() => null);

        invalidateCitizensListCache();
        io.emit('audit_logs_updated');
        io.emit('users_updated');
        const usersData = await fetchCitizensList();
        io.emit('response_users_data', usersData);
      } catch (e) {
        console.error('[bulk_block_citizens] error:', e);
      }
    });

    socket.on('bulk_verify_citizens', async (data: { userIds: string[] }) => {
      try {
        const { userIds = [] } = data;
        if (!Array.isArray(userIds) || userIds.length === 0) return;

        const isMongo = (idStr?: any) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr.trim());
        const mongoIds = userIds.filter(isMongo);
        const nonMongo = userIds.filter(id => !isMongo(id));

        const orConditions: any[] = [];
        if (mongoIds.length > 0) orConditions.push({ id: { in: mongoIds } });
        if (nonMongo.length > 0) orConditions.push({ email: { in: nonMongo } });

        const updated = await prisma.user.updateMany({
          where: { OR: orConditions },
          data: { status: 'ACTIVE' }
        });

        await prisma.auditLog.create({
          data: {
            userId: 'admin_action',
            action: 'USERS_BULK_VERIFIED',
            details: `Batch verified ${updated.count} citizen(s)`,
          }
        }).catch(() => null);

        io.emit('audit_logs_updated');
        io.emit('users_updated');
        const usersData = await fetchCitizensList();
        io.emit('response_users_data', usersData);
      } catch (e) {
        console.error('[bulk_verify_citizens] error:', e);
      }
    });

    socket.on('send_push_notification', async (data: { userId: string; title: string; body: string; type?: string }) => {
      try {
        const { userId, title, body, type = 'INFO' } = data;
        const u = await findUserByIdOrCit(userId);
        const targetUserId = u ? u.id : userId;

        const notifTitle = (title || '📢 Cybersave Notification').trim();
        const notifBody = (body || '').trim();

        const notifPayload = {
          id: `notif_${Date.now()}`,
          userId: targetUserId,
          userEmail: u?.email || (data as any).userEmail,
          userPhone: u?.phone || (data as any).userPhone,
          userName: u?.profile?.fullName || u?.fullName || (data as any).userName || 'Citizen User',
          title: notifTitle,
          body: notifBody,
          message: notifBody,
          content: notifBody,
          type: type || 'INFO',
          status: 'SENT',
          isBroadcast: true,
          broadcast: true,
          fromAdmin: true,
          source: (data as any).source || 'USER_MANAGEMENT_SOCKET',
          createdAt: new Date().toISOString()
        };

        const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
        if (targetUserId && isMongoId(targetUserId)) {
          const createdDbNotif = await prisma.notification.create({
            data: {
              userId: targetUserId,
              title: notifTitle,
              body: notifBody,
              status: 'SENT',
              sentAt: new Date(),
            },
          }).catch(() => null);

          if (createdDbNotif) notifPayload.id = createdDbNotif.id;

          await prisma.auditLog.create({
            data: {
              userId: targetUserId,
              action: 'NOTIFICATION_SENT',
              details: `Dispatch sent: "${notifTitle}"`,
            },
          }).catch(() => null);
        }

        // Live broadcast across all mobile sockets and admin dashboards
        io.emit('user_push_notification', notifPayload);
        io.emit('receive_global_push', notifPayload);
        io.emit('broadcast_notification', notifPayload);
        io.emit('campaign_broadcast', notifPayload);
        io.emit('new_notification', notifPayload);
        io.emit('notifications_updated');

        // Direct FCM push if device has fcmToken
        if (messaging && u?.fcmToken && u.fcmToken.length > 10) {
          messaging.send({
            token: u.fcmToken,
            notification: {
              title: notifTitle,
              body: notifBody
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'cybersave_alerts_channel',
                priority: 'max',
                defaultSound: true,
                defaultVibrateTimings: true,
                visibility: 'public',
                icon: 'ic_launcher'
              }
            },
            data: {
              title: notifTitle,
              body: notifBody,
              message: notifBody,
              type: String(type),
              userId: targetUserId
            }
          }).catch((err: any) => console.warn('[Socket send_push_notification FCM note]:', err?.message));
        }

        socket.emit('response_push_sent', { success: true, message: 'Notification dispatched successfully', notification: notifPayload });
      } catch (e: any) {
        console.error('[Socket] send_push_notification error:', e);
        socket.emit('response_push_sent', { success: false, error: e.message });
      }
    });

    socket.on('request_applications_data', async (params?: { page?: number; limit?: number }) => {
      try {
        const page = params?.page || 1;
        const limit = Math.min(params?.limit || 50, 100);
        const skip = (page - 1) * limit;
        const today = new Date(); today.setHours(0,0,0,0);

        // Fetch all applications lightweight for real overall stats & pipeline
        const allDbApps = await prisma.application.findMany({
          select: {
            id: true,
            status: true,
            submittedAt: true,
            updatedAt: true
          }
        });

        const totalApps = allDbApps.length;
        const todayApps = allDbApps.filter(a => {
          const sub = new Date(a.submittedAt || Date.now());
          return sub >= today;
        }).length;

        const submitted = allDbApps.filter(a => String(a.status || '').toUpperCase() === 'SUBMITTED').length;
        const underReview = allDbApps.filter(a => ['VERIFYING', 'PENDING', 'UNDER_REVIEW', 'IN_REVIEW', 'REVIEW'].includes(String(a.status || '').toUpperCase())).length;
        const processing = allDbApps.filter(a => ['IN_PROGRESS', 'PROCESSING'].includes(String(a.status || '').toUpperCase())).length;
        const approved = allDbApps.filter(a => String(a.status || '').toUpperCase() === 'APPROVED').length;
        const completedTotal = allDbApps.filter(a => String(a.status || '').toUpperCase() === 'COMPLETED').length;
        const pending = submitted + underReview;
        const completedToday = allDbApps.filter(a => ['APPROVED', 'COMPLETED'].includes(String(a.status || '').toUpperCase()) && new Date(a.updatedAt || a.submittedAt || Date.now()) >= today).length;

        const apps = await fetchApplicationsWithUsers({}, limit, skip);

        const formattedApps = apps.map(a => ({
          id: a.refNumber || `APP-2026-${a.id.substring(0, 4).toUpperCase()}`,
          rawId: a.id,
          dbId: a.id,
          refNumber: a.refNumber,
          citizen: a.user?.profile?.fullName || (a.user?.email ? a.user.email.split('@')[0] : 'Citizen User'),
          citizenName: a.user?.profile?.fullName || (a.user?.email ? a.user.email.split('@')[0] : 'Citizen User'),
          citizenEmail: a.user?.email || a.formData?.email || '',
          citizenPhone: a.user?.phone || a.user?.profile?.phone || a.formData?.phone || 'N/A',
          serviceType: a.serviceTitle || a.service?.title || 'Government Service',
          service: a.serviceTitle || a.service?.title || 'Government Service',
          priority: 'Medium',
          status: a.status === 'APPROVED' ? 'Approved' : (a.status === 'COMPLETED' ? 'Completed' : (a.status === 'REJECTED' ? 'Rejected' : (a.status === 'IN_PROGRESS' || a.status === 'PROCESSING' ? 'Processing' : (a.status === 'VERIFYING' || a.status === 'PENDING' ? 'Under Review' : 'Submitted')))),
          rawStatus: a.status,
          assigned: isRealOfficer(a.officialOfficer),
          submitted: a.submittedAt ? a.submittedAt.toISOString() : new Date().toISOString(),
          sla: '24h',
          amount: a.feePaid || 50,
          feeAmount: a.feePaid || 50,
          refundStatus: a.refundRequests?.[0]?.status || null,
          rejectionReason: a.rejectionReason || '',
          rawApp: a
        }));

        socket.emit('response_applications_data', {
          stats: { totalApps, todayApps, pending, processing, completed: completedToday },
          pipeline: { submitted, underReview, processing, approved, completed: completedTotal },
          applications: formattedApps
        });
      } catch(e: any) {
        console.error('[Socket] request_applications_data error:', e);
        socket.emit('response_applications_data', {
          stats: { totalApps: 0, todayApps: 0, pending: 0, processing: 0, completed: 0 },
          pipeline: { submitted: 0, underReview: 0, processing: 0, approved: 0, completed: 0 },
          applications: []
        });
      }
    });

    socket.on('request_application_detail', async (data: { id: string }) => {
      try {
        const idOrRef = data?.id ? String(data.id).trim() : '';
        if (!idOrRef) {
          return socket.emit('response_application_detail', null);
        }
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(idOrRef);
        let app: any = null;

        if (isMongoId) {
          app = await prisma.application.findUnique({
            where: { id: idOrRef },
            include: {
              user: { include: { profile: true, documents: true, aadhaarDocs: true } },
              service: true,
              refundRequests: true,
              documentUploads: true,
            }
          });
        }
        if (!app) {
          app = await prisma.application.findFirst({
            where: { refNumber: idOrRef },
            include: {
              user: { include: { profile: true, documents: true, aadhaarDocs: true } },
              service: true,
              refundRequests: true,
              documentUploads: true,
            }
          });
        }
        if (!app) {
          app = await prisma.application.findFirst({
            orderBy: { submittedAt: 'desc' },
            include: {
              user: { include: { profile: true, documents: true, aadhaarDocs: true } },
              service: true,
              refundRequests: true,
              documentUploads: true,
            }
          });
        }

        if (app) {
          socket.emit('response_application_detail', {
            id: app.refNumber || app.id,
            rawId: app.id,
            dbId: app.id,
            refNumber: app.refNumber,
            serviceName: app.serviceTitle || app.service?.title || 'Government Service',
            serviceCategory: app.service?.category || 'Government',
            sla: '4h 32m',
            submitted: new Date(app.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            submittedAt: app.submittedAt,
            updatedAt: app.updatedAt,
            assignedTo: isRealOfficer(app.officialOfficer),
            centre: app.user?.profile?.district ? `CSC ${app.user.profile.district}` : 'CSC Hazratganj, Lucknow',
            status: app.status,
            amount: app.feePaid || 50,
            feePaid: app.feePaid || 50,
            rejectionReason: app.rejectionReason,
            formData: app.formData,
            documents: app.documents || [],
            documentUploads: app.documentUploads || [],
            applicant: {
              id: `CIT-${app.userId ? app.userId.substring(0, 5).toUpperCase() : 'USER'}`,
              name: app.user?.profile?.fullName || app.formData?.fullName || 'Citizen User',
              email: app.user?.email || app.formData?.email || '',
              phone: app.user?.phone || app.user?.profile?.phone || app.formData?.phone || '',
              aadhaar: app.user?.profile?.aadhaarNumber || app.formData?.aadhaarNumber || 'Verified Identity Vault',
              mobile: app.user?.phone || '+91 98765 43210'
            },
            rawApp: app
          });
        } else {
          socket.emit('response_application_detail', null);
        }
      } catch (e: any) {
        console.error('[Socket] request_application_detail error:', e);
        socket.emit('response_application_detail', null);
      }
    });

    socket.on('update_application_status', async (data: any) => {
      try {
        const targetId = data?.applicationId || data?.id || data?.refNumber;
        if (!targetId) return;
        const result = await performApplicationStatusUpdate({
          targetId,
          status: data.status,
          rejectionReason: data.rejectionReason,
          adminId: data.adminId,
          adminName: data.adminName,
          adminEmail: data.adminEmail,
          adminRole: data.adminRole,
          io,
        });
        socket.emit('update_application_status_success', result.payload);
      } catch (e: any) {
        console.error('[Socket] update_application_status error:', e.message);
      }
    });

    socket.on('approve_application', async (data: any) => {
      try {
        const targetId = data?.applicationId || data?.id || data?.refNumber;
        if (!targetId) return;
        await performApplicationStatusUpdate({
          targetId,
          status: 'APPROVED',
          adminId: data.adminId,
          adminName: data.adminName,
          adminEmail: data.adminEmail,
          adminRole: data.adminRole,
          io,
        });
      } catch (e: any) {
        console.error('[Socket] approve_application error:', e.message);
      }
    });

    socket.on('reject_application', async (data: any) => {
      try {
        const targetId = data?.applicationId || data?.id || data?.refNumber;
        if (!targetId) return;
        await performApplicationStatusUpdate({
          targetId,
          status: 'REJECTED',
          rejectionReason: data.rejectionReason,
          adminId: data.adminId,
          adminName: data.adminName,
          adminEmail: data.adminEmail,
          adminRole: data.adminRole,
          io,
        });
      } catch (e: any) {
        console.error('[Socket] reject_application error:', e.message);
      }
    });

    socket.on('assign_application', async (data: any) => {
      try {
        const targetId = String(data?.applicationId || data?.id).trim();
        const opName = data?.operatorName || 'Principal Verification Officer (SDM)';
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(targetId);
        let app: any = null;
        if (isMongoId) {
          app = await prisma.application.findUnique({ where: { id: targetId } });
        }
        if (!app) {
          app = await prisma.application.findFirst({
            where: isMongoId
              ? { OR: [{ refNumber: targetId }, { id: targetId }] }
              : { refNumber: targetId }
          });
        }
        if (app) {
          const updated = await prisma.application.update({
            where: { id: app.id },
            data: { officialOfficer: opName }
          });
          io.emit('application_assigned', {
            id: updated.id,
            refNumber: updated.refNumber,
            officialOfficer: updated.officialOfficer
          });
          io.emit('applications_updated');
        }
      } catch (e: any) {
        console.error('[Socket] assign_application error:', e.message);
      }
    });

    socket.on('bulk_approve_applications', async (data: { applicationIds: string[]; adminName?: string; adminEmail?: string }) => {
      try {
        const ids = data?.applicationIds || [];
        for (const id of ids) {
          await performApplicationStatusUpdate({
            targetId: id,
            status: 'APPROVED',
            adminName: data.adminName || 'Principal Verification Officer (SDM)',
            adminEmail: data.adminEmail || 'admin@cybersave.com',
            io,
          }).catch(() => null);
        }
        io.emit('applications_updated');
        io.emit('dashboard_updated');
      } catch (e: any) {
        console.error('[Socket] bulk_approve_applications error:', e.message);
      }
    });

    socket.on('bulk_assign_applications', async (data: { applicationIds: string[]; operatorName: string }) => {
      try {
        const ids = data?.applicationIds || [];
        const opName = data?.operatorName || 'Principal Verification Officer (SDM)';
        const isMongoId = (idStr?: any) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr.trim());
        const mongoIds = ids.filter(isMongoId);
        const refNumbers = ids.filter(id => !isMongoId(id));

        const orConditions: any[] = [];
        if (mongoIds.length > 0) orConditions.push({ id: { in: mongoIds } });
        if (refNumbers.length > 0) orConditions.push({ refNumber: { in: refNumbers } });

        if (orConditions.length > 0) {
          await prisma.application.updateMany({
            where: { OR: orConditions },
            data: { officialOfficer: opName }
          });
          io.emit('applications_updated');
          io.emit('dashboard_updated');
        }
      } catch (e: any) {
        console.error('[Socket] bulk_assign_applications error:', e.message);
      }
    });

    socket.on('bulk_escalate_applications', async (data: { applicationIds: string[] }) => {
      try {
        const ids = data?.applicationIds || [];
        const isMongoId = (idStr?: any) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr.trim());
        const mongoIds = ids.filter(isMongoId);
        const refNumbers = ids.filter(id => !isMongoId(id));

        const orConditions: any[] = [];
        if (mongoIds.length > 0) orConditions.push({ id: { in: mongoIds } });
        if (refNumbers.length > 0) orConditions.push({ refNumber: { in: refNumbers } });

        if (orConditions.length > 0) {
          const apps = await prisma.application.findMany({
            where: { OR: orConditions },
            select: { id: true, formData: true }
          });
          for (const app of apps) {
            const prevForm = (app.formData as any) || {};
            await prisma.application.update({
              where: { id: app.id },
              data: {
                formData: { ...prevForm, priority: 'High', escalatedAt: new Date().toISOString() }
              }
            }).catch(() => null);
          }
          io.emit('applications_updated');
          io.emit('dashboard_updated');
        }
      } catch (e: any) {
        console.error('[Socket] bulk_escalate_applications error:', e.message);
      }
    });

    socket.on('request_services_data', async () => {
      try {
        const [totalServices, activeServices, services] = await Promise.all([
          prisma.service.count(),
          prisma.service.count({ where: { isActive: true } }),
          prisma.service.findMany({ take: 100 })
        ]);
        
        // Group services by category
        const groups: Record<string, any> = {};
        services.forEach(s => {
          if (!groups[s.category]) {
            groups[s.category] = {
              category: s.category,
              department: s.department,
              subServices: []
            };
          }
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
            status: s.isActive ? 'Active' : 'Inactive',
            isActive: s.isActive
          });
        });

        socket.emit('response_services_data', {
          stats: { totalServices, active: activeServices, offline: 0, drafts: 0 },
          services: Object.values(groups),
          rawServices: services,
        });
      } catch (e) { console.error(e); }
    });

    socket.on('request_service_detail', async (data: { id: string }) => {
      try {
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(data.id);
        let s: any = null;
        if (isMongoId) {
          s = await prisma.service.findUnique({ where: { id: data.id } });
        }
        if (!s) {
          s = await prisma.service.findFirst({
            where: {
              OR: [{ slug: data.id }, { title: { equals: data.id, mode: 'insensitive' } }],
            },
          });
        }
        socket.emit('response_service_detail', formatServiceResponse(s));
      } catch (e) {
        console.error('[Socket] request_service_detail error:', e);
        socket.emit('response_service_detail', null);
      }
    });

    socket.on('edit_service', async (data: { id: string, name: string }) => {
      try {
        await prisma.service.update({
          where: { id: data.id },
          data: { title: data.name }
        });
        socket.emit('edit_service_success');
        io.emit('services_updated');
      } catch (e) { console.error(e); }
    });

    socket.on('create_application', async (data: { title: string, description: string }) => {
      try {
        await prisma.service.create({
          data: {
            slug: data.title.toLowerCase().replace(/\s+/g, '-'),
            title: data.title,
            description: data.description,
            category: 'Government',
            department: 'General Administration',
            fee: 50.0,
            processingTime: '3-5 working days',
            isActive: true,
            iconName: 'file-text',
            colorHex: '#3b82f6'
          }
        });
        socket.emit('create_application_success');
        io.emit('applications_updated');
        io.emit('services_updated');
      } catch (e) {
        console.error('Failed to create application workflow:', e);
      }
    });

    socket.on('save_service_config', async (data: any) => {
      try {
        const rawTitle = data.name || data.title || 'Custom Service';
        const slug = (data.slug || rawTitle).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        const feeVal = typeof data.pricing?.fee === 'number' ? data.pricing.fee : (parseFloat(data.fee || '50.0') || 50.0);

        // Metadata with no dedicated columns (Overview copy, teams, tags,
        // publish flag) round-trips inside pricingConfig so a later edit
        // restores exactly what was saved instead of reverting to templates.
        const incomingPricing = (typeof data.pricing === 'object' && data.pricing !== null)
          ? data.pricing
          : (typeof data.pricingConfig === 'object' && data.pricingConfig !== null ? data.pricingConfig : { fee: feeVal });
        if (data.assignedTeams !== undefined) incomingPricing.assignedTeams = data.assignedTeams;
        if (data.searchTags !== undefined) incomingPricing.searchTags = data.searchTags;
        if (data.displayName !== undefined) incomingPricing.displayName = data.displayName;
        if (data.shortDescription !== undefined) incomingPricing.shortDescription = data.shortDescription;
        if (data.detailedDescription !== undefined) incomingPricing.detailedDescription = data.detailedDescription;
        if (data.isPublished !== undefined) incomingPricing.isPublished = Boolean(data.isPublished);

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
          pricingConfig: incomingPricing,
          iconName: data.iconName || 'file-document-outline',
          colorHex: data.colorHex || '#2563eb',
          isActive: data.status === 'Active' || data.isActive === true || data.status === undefined,
        };

        // EDIT vs CREATE: update the exact record when the payload carries an
        // existing service id (or a slug that resolves), never duplicate it.
        const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
        let existing: any = null;
        if (data.id && isMongoId(data.id)) {
          existing = await prisma.service.findUnique({ where: { id: data.id } }).catch(() => null);
        }
        if (!existing && data.id) {
          existing = await prisma.service.findUnique({ where: { slug: data.id } }).catch(() => null);
        }
        if (!existing) {
          existing = await prisma.service.findUnique({ where: { slug } }).catch(() => null);
        }

        let newService: any;
        if (existing) {
          newService = await prisma.service.update({
            where: { id: existing.id },
            data: {
              ...updateData,
              ...(data.eligibility ? { eligibility: data.eligibility } : {}),
              ...(data.slug ? { slug: data.slug } : {}),
            },
          });
        } else {
          newService = await prisma.service.create({
            data: {
              slug,
              ...updateData,
              eligibility: data.eligibility || ['Citizen of India', 'Valid ID verification credentials'],
            }
          });
        }

        console.log('[Socket] Service configuration saved and published:', newService.id);
        socket.emit('save_service_config_success', newService);
        io.emit('services_updated', newService);
        io.emit('service_created', newService);
        io.emit('service_updated', newService);
      } catch (e) {
        console.error('Failed to save service config:', e);
        socket.emit('save_service_config_error', { error: (e as any).message });
      }
    });

    // In-memory caching for socket queries uses module-scoped caches
    async function getSocketFastOperatorsList() {
      if (socketOperatorsListCache && Date.now() - socketOperatorsListCache.timestamp < 60000) {
        return socketOperatorsListCache.data;
      }

      const [totalOps, ops] = await Promise.all([
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            permissions: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const formattedOps = ops.map(o => {
        const base = o.email ? o.email.split('@')[0] : '';
        let displayName = 'Admin Officer';
        if (o.email === 'admin@cybersave.com') displayName = 'Super Administrator';
        else if (o.email === 'officer.admin@cybersave.gov.in') displayName = 'Principal Verification Officer';
        else if (base) displayName = base.replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

        return {
          id: o.id, 
          name: displayName, 
          email: o.email || '',
          phone: o.phone || '+91 98765 43210',
          role: (o.email === 'admin@cybersave.com' || o.email === 'officer.admin@cybersave.gov.in') ? 'Super Admin' : 'Field Operator', 
          department: 'CSC Operations & Verification Desk', 
          joinedDate: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : '14/08/2026', 
          lastActive: 'Active now', 
          status: o.status === 'SUSPENDED' ? 'Suspended' : 'Active',
          avatarUrl: null,
          permissions: o.permissions && o.permissions.length > 0 ? o.permissions : ['DASHBOARD', 'APPLICATIONS', 'SETTINGS']
        };
      });

      const resData = {
        stats: { totalOps: totalOps, active: totalOps, pending: 0, suspended: 0 },
        operators: formattedOps
      };
      socketOperatorsListCache = { data: resData, timestamp: Date.now() };
      return resData;
    }

    async function getSocketFastOperatorData(id?: string) {
      const cacheKey = id || 'default';
      const cached = socketOperatorCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        return cached.data;
      }

      const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
      let userWhere: any = { role: 'ADMIN' };
      if (isMongoId(id)) {
        userWhere = { id };
      } else if (id && typeof id === 'string') {
        const cleanId = id.trim().toLowerCase();
        userWhere = {
          OR: [
            { email: { equals: cleanId, mode: 'insensitive' } },
            { keycloakId: id },
            { phone: id }
          ]
        };
      }

      const [user, logs] = await Promise.all([
        prisma.user.findFirst({
          where: userWhere,
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            permissions: true,
            status: true,
            createdAt: true
          }
        }),
        prisma.auditLog.findMany({
          where: (id && id.length === 24)
            ? { userId: id }
            : { action: { contains: 'OPERATOR' } },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            action: true,
            details: true,
            ipAddress: true,
            createdAt: true
          }
        })
      ]);

      if (!user) return null;

      // Operator-scoped activity logs: strictly ONLY this operator's performed operations
      const userLogs = await prisma.auditLog.findMany({
        where: {
          userId: user.id
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          action: true,
          details: true,
          ipAddress: true,
          createdAt: true
        }
      });

      const activityLogsList = userLogs.length > 0 ? userLogs : [
        {
          id: `log-init-${user.id}`,
          action: 'OPERATOR_ONBOARDING',
          details: `Operator account initialized and provisioned with administrative credentials for ${user.email}.`,
          ipAddress: '106.222.215.137',
          createdAt: user.createdAt || new Date()
        }
      ];

      const profilePromise = prisma.profile.findFirst({
        where: { userId: user.id },
        select: {
          fullName: true,
          phone: true,
          avatarUrl: true,
          address: true,
          district: true,
          state: true,
          pinCode: true,
          dob: true,
          gender: true
        }
      }).catch(() => null);

      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 1200));
      const profile: any = await Promise.race([profilePromise, timeoutPromise]);

      const activityLogs = activityLogsList.map(l => ({
        id: l.id,
        dateTime: l.createdAt ? new Date(l.createdAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Recent',
        action: l.action || 'Administrative Review',
        status: (l.action && l.action.toLowerCase().includes('reject')) ? 'FAILED' : 
                (l.action && l.action.toLowerCase().includes('warn')) ? 'WARNING' : 'SUCCESS',
        ipAddress: l.ipAddress || '106.222.215.137',
        details: l.details || '-'
      }));

      // Real Database queries for documents & applications handled by this operator
      const [userDocUploads, operatorApps] = await Promise.all([
        prisma.documentUpload.findMany({
          where: { userId: user.id },
          orderBy: { uploadedAt: 'desc' }
        }).catch(() => []),
        prisma.application.findMany({
          where: {
            OR: [
              { userId: user.id },
              ...(profile?.fullName ? [{ officialOfficer: { contains: profile.fullName } }] : []),
              ...(user.email ? [{ officialOfficer: { contains: user.email } }] : [])
            ]
          },
          include: {
            documentUploads: true
          },
          take: 100,
          orderBy: { updatedAt: 'desc' }
        }).catch(() => [])
      ]);

      const realDocuments: any[] = [];
      const seenDocIds = new Set<string>();

      // Strictly this operator's own uploaded identity and compliance credentials
      for (const doc of (userDocUploads || [])) {
        if (!seenDocIds.has(doc.id)) {
          seenDocIds.add(doc.id);
          const isImg = (doc.fileType?.toLowerCase().includes('image') || (doc.fileName && /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.fileName)) || (doc.fileUrl && doc.fileUrl.startsWith('data:image')));
          realDocuments.push({
            id: doc.id,
            refNum: `DOC-${doc.id.slice(-4).toUpperCase()}`,
            fileName: doc.fileName || 'Uploaded_Document',
            title: (doc.fileName || 'Uploaded Document').replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
            documentType: doc.fileType || (isImg ? 'Identity Proof' : 'Compliance Document'),
            type: isImg ? 'IMAGE' : 'PDF',
            status: 'Verified',
            uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            expires: 'N/A',
            fileUrl: doc.fileUrl
          });
        }
      }

      const totalProcessed = (operatorApps || []).length;
      const approvalsCount = (operatorApps || []).filter(a => ['APPROVED', 'COMPLETED'].includes(a.status)).length;
      const rejectionsCount = (operatorApps || []).filter(a => a.status === 'REJECTED').length;
      const pendingCount = (operatorApps || []).filter(a => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(a.status)).length;
      const rejectionRateStr = totalProcessed > 0 ? `${((rejectionsCount / totalProcessed) * 100).toFixed(1)}%` : '0.0%';
      const accuracyStr = totalProcessed > 0 ? `${(((totalProcessed - rejectionsCount) / totalProcessed) * 100).toFixed(1)}% Accuracy` : '100% Accuracy';

      const operatorData = {
        id: user.id,
        name: profile?.fullName || (user.email ? user.email.split('@')[0] : 'Admin Officer'),
        email: user.email || '',
        phone: user.phone || profile?.phone || '+91 98765 43210',
        role: (user.email === 'admin@cybersave.com' || user.email === 'officer.admin@cybersave.gov.in') ? 'Super Admin' : 'Field Operator',
        department: profile?.district ? `Seva Kendra (${profile.district})` : 'CSC Operations & Verification Desk',
        permissions: user.permissions && user.permissions.length > 0 ? user.permissions : ['DASHBOARD', 'APPLICATIONS', 'TRANSACTIONS', 'SERVICES', 'USERS', 'OPERATORS', 'SUPPORT', 'AUDIT', 'SETTINGS'],
        joinedDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : '14/08/2026',
        lastActive: 'Active now',
        status: user.status === 'SUSPENDED' ? 'Suspended' : 'Active',
        avatarUrl: profile?.avatarUrl || null,
        address: profile?.address || 'CSC Seva Kendra, Main Administrative Complex',
        district: profile?.district || 'Lucknow',
        state: profile?.state || 'Uttar Pradesh',
        pinCode: profile?.pinCode || '226001',
        dob: profile?.dob || '1992-06-15',
        gender: profile?.gender || 'Male',
        twoFactorEnabled: true,
        metrics: {
          tasksCompleted: totalProcessed,
          tasksMom: totalProcessed > 0 ? '+12% MoM' : '0% MoM',
          avgResponseTime: totalProcessed > 0 ? '12 min' : '—',
          responseTier: totalProcessed > 0 ? 'Tier 1' : 'Standard',
          satisfactionRating: totalProcessed > 0 ? 4.9 : 0,
          documentsProcessed: realDocuments.length,
          accuracyRate: accuracyStr,
        },
        stats: {
          applicationsProcessed: totalProcessed,
          approvalsCompleted: approvalsCount,
          rejectionRate: rejectionRateStr,
          averageProcessingTime: totalProcessed > 0 ? '12 min' : '0 min',
          pendingApplications: pendingCount,
          satisfactionRating: totalProcessed > 0 ? 4.9 : 0,
          documentsProcessed: realDocuments.length,
          accuracyRate: accuracyStr
        },
        reportingStructure: {
          supervisorName: 'Super Administrator',
          supervisorRole: 'District Collectorate / IT Mission',
          primaryShift: 'Day Shift (09:00 - 18:00 IST)',
        },
        documents: realDocuments,
        complianceActions: realDocuments.some(d => d.status === 'Expired') ? [
          {
            id: 'comp-1',
            title: 'Document Expiration Alert',
            status: 'Action Required',
            severity: 'danger',
            description: 'One or more assigned/reviewed documents require compliance re-verification.'
          }
        ] : [],
        activityLogs,
      };

      socketOperatorCache.set(cacheKey, { data: operatorData, timestamp: Date.now() });
      socketOperatorCache.set(user.id, { data: operatorData, timestamp: Date.now() });

      profilePromise.then((p: any) => {
        if (p) {
          operatorData.name = p.fullName || operatorData.name;
          if (p.phone) operatorData.phone = p.phone;
          if (p.district) operatorData.district = p.district;
          if (p.state) operatorData.state = p.state;
          if (p.address) operatorData.address = p.address;
          socketOperatorCache.set(cacheKey, { data: operatorData, timestamp: Date.now() });
          socketOperatorCache.set(user.id, { data: operatorData, timestamp: Date.now() });
        }
      });

      return operatorData;
    }

    socket.on('request_operators_data', async () => {
      try {
        const resData = await getSocketFastOperatorsList();
        socket.emit('response_operators_data', resData);
      } catch (e) { console.error('[Socket] request_operators_data error:', e); }
    });

    socket.on('reset_operator_password', async (data: { id: string; password?: string }) => {
      try {
        if (!data?.id) return;
        const newPass = data.password || 'CyberSave@2026';
        const passwordHash = await bcrypt.hash(newPass, 8);
        const updated = await prisma.user.update({
          where: { id: data.id },
          data: { passwordHash }
        });
        await prisma.auditLog.create({
          data: {
            userId: data.id,
            action: 'OPERATOR_PASSWORD_RESET',
            details: `Operator #${data.id.slice(-6)} credentials reset via secure administrative protocol. User: ${updated.email}.`,
            ipAddress: '127.0.0.1',
          }
        }).catch(() => null);
        socketOperatorCache.clear();
        socket.emit('reset_operator_password_success', { success: true, id: data.id });
        io.emit('operators_updated');
      } catch (err) {
        console.error('[Socket] reset_operator_password error:', err);
      }
    });

    socket.on('update_operator_status', async (data: { id: string; status: string }) => {
      try {
        if (!data?.id) return;
        const updated = await prisma.user.update({
          where: { id: data.id },
          data: { status: data.status || 'ACTIVE' }
        });
        await prisma.auditLog.create({
          data: {
            userId: data.id,
            action: 'OPERATOR_STATUS_CHANGED',
            details: `Operator #${data.id.slice(-6)} status updated to ${data.status}. User: ${updated.email}.`,
            ipAddress: '127.0.0.1',
          }
        }).catch(() => null);
        socketOperatorCache.clear();
        socket.emit('update_operator_status_success', { success: true, id: data.id, status: data.status });
        io.emit('operators_updated');
      } catch (err) {
        console.error('[Socket] update_operator_status error:', err);
      }
    });

    socket.on('update_operator_access', async (data: { id: string, permissions: string[] }) => {
      try {
        const updated = await prisma.user.update({
          where: { id: data.id },
          data: { permissions: data.permissions }
        });

        await prisma.auditLog.create({
          data: {
            userId: data.id,
            action: 'OPERATOR_UPDATED',
            details: `Operator #${data.id.slice(-6)} permissions updated via socket: [${data.permissions.join(', ')}]. User: ${updated.email}.`,
            ipAddress: socket.handshake.address || '127.0.0.1',
          }
        }).catch(() => null);

        socketOperatorCache.clear();
        socketOperatorsListCache = null;
        socketAuditLogsCache = null;
        socket.emit('update_operator_access_success', { id: data.id, permissions: data.permissions });
        io.emit('operator_permissions_updated', { id: data.id, permissions: data.permissions });
        io.emit('audit_logs_updated');
        io.emit('dashboard_updated');
        // Broadcast the update so all clients refresh
        const resData = await getSocketFastOperatorsList();
        io.emit('response_operators_data', resData);
        io.emit('operators_updated');
      } catch (e) { console.error('Failed to update operator permissions:', e); }
    });

    socket.on('upload_operator_document', async (data: { id: string; fileName: string; fileUrl: string; fileType?: string; fileSize?: number }) => {
      try {
        if (!data?.id || !data?.fileUrl) return;
        const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
        let opUser: any = null;
        if (isMongoId(data.id)) {
          opUser = await prisma.user.findUnique({ where: { id: data.id } });
        }
        if (!opUser && data.id && typeof data.id === 'string') {
          const clean = data.id.trim().toLowerCase();
          opUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: { equals: clean, mode: 'insensitive' } },
                { keycloakId: data.id },
                { phone: data.id }
              ]
            }
          });
        }
        if (!opUser) return;
        const cleanFileName = data.fileName || 'Operator_Document.pdf';
        const isPdf = cleanFileName.toLowerCase().endsWith('.pdf') || data.fileUrl.startsWith('data:application/pdf');
        const isImg = !isPdf && (Boolean(cleanFileName.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/)) || data.fileUrl.startsWith('data:image'));
        const cleanFileType = data.fileType || (isPdf ? 'application/pdf' : (isImg ? 'image/jpeg' : 'application/octet-stream'));

        const newDoc = await prisma.documentUpload.create({
          data: {
            userId: opUser.id,
            fileName: cleanFileName,
            fileUrl: data.fileUrl,
            fileType: cleanFileType,
            fileSize: data.fileSize || Math.round(data.fileUrl.length * 0.75),
          }
        });
        invalidateSocketOperatorCache(opUser.id);
        const updatedData = await getSocketFastOperatorData(opUser.id);
        io.emit('operator_detail_updated', updatedData);
        io.emit('operators_updated');
        socket.emit('upload_operator_document_success', { success: true, document: newDoc });
      } catch (err) {
        console.error('Socket upload_operator_document error:', err);
      }
    });

    socket.on('add_new_operator', async (data: { name: string, email: string, password?: string, permissions?: string[] }) => {
      try {
        const cleanEmail = (data.email || '').toLowerCase().trim();
        let user = await prisma.user.findFirst({ where: { email: cleanEmail } });
        
        if (user) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { permissions: data.permissions || ['DASHBOARD', 'APPLICATIONS'], status: 'ACTIVE', role: 'ADMIN' }
          });
        } else {
          const passwordHash = await bcrypt.hash(data.password || 'admin123', 8);
          user = await prisma.user.create({
            data: {
              email: cleanEmail,
              phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
              keycloakId: `op-${Date.now()}-${Math.floor(Math.random()*1000)}`,
              role: 'ADMIN',
              status: 'ACTIVE',
              passwordHash,
              permissions: data.permissions || ['DASHBOARD', 'APPLICATIONS'],
              profile: {
                create: {
                  fullName: data.name
                }
              }
            }
          });
        }

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'OPERATOR_REGISTERED',
            details: `New Seva Kendra Operator "${data.name}" (${cleanEmail}) registered with least-privilege permissions: [${(data.permissions || []).join(', ')}].`,
            ipAddress: socket.handshake.address || '127.0.0.1',
          }
        }).catch(() => null);

        socketOperatorCache.clear();
        socketOperatorsListCache = null;
        socketAuditLogsCache = null;
        socket.emit('add_new_operator_success', user.id);
        io.emit('audit_logs_updated');
        io.emit('dashboard_updated');
        const resData = await getSocketFastOperatorsList();
        io.emit('response_operators_data', resData);
        io.emit('operators_updated');
      } catch (e) {
        console.error('Failed to create new operator:', e);
      }
    });

    socket.on('bulk_verify_citizens', async (data: { userIds: string[] }) => {
      try {
        const { userIds = [] } = data;
        const isMongo = (idStr?: any) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr.trim());
        const mongoIds = userIds.filter(isMongo);
        const nonMongo = userIds.filter(id => !isMongo(id));

        const orConditions: any[] = [];
        if (mongoIds.length > 0) orConditions.push({ id: { in: mongoIds } });
        if (nonMongo.length > 0) orConditions.push({ email: { in: nonMongo } });

        const updated = await prisma.user.updateMany({
          where: { OR: orConditions },
          data: { status: 'ACTIVE' }
        });

        await prisma.auditLog.create({
          data: {
            userId: 'admin_action',
            action: 'USERS_BULK_VERIFIED',
            details: `Batch verified ${updated.count} citizen(s)`,
            ipAddress: '127.0.0.1',
            userAgent: 'Admin Console WebSocket'
          }
        }).catch(() => null);

        io.emit('users_updated');
        io.emit('citizens_bulk_updated', { userIds, status: 'Verified' });
        io.emit('audit_logs_updated');
        socket.emit('bulk_verify_citizens_success', { count: updated.count });
      } catch (e) {
        console.error('[Socket] bulk_verify_citizens error:', e);
      }
    });

    socket.on('request_transactions_data', async () => {
      try {
        const data = await fetchRealTransactionsData();
        socket.emit('response_transactions_data', data);
      } catch (e) {
        console.error('[Socket] request_transactions_data error:', e);
      }
    });

    socket.on('request_operator_detail', async (data: { id: string }) => {
      try {
        const operatorData = await getSocketFastOperatorData(data?.id);
        socket.emit('response_operator_detail', operatorData);
      } catch (e) { console.error('[Socket] request_operator_detail error:', e); }
    });

    socket.on('request_notifications', async () => {
      try {
        const [total, unread, notifications] = await Promise.all([
          prisma.notification.count(),
          prisma.notification.count({ where: { status: 'PENDING' } }),
          prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8
          })
        ]);

        let formatted = notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.body,
          time: n.createdAt.toISOString(),
          status: n.status
        }));

        socket.emit('response_notifications', {
          stats: { totalHistory: total, unreadAlerts: unread, successLogs: total - unread, pendingChecks: unread },
          notifications: formatted
        });
      } catch (e) { console.error(e); }
    });

    socket.on('send_global_push', async (data: { title: string, body: string }) => {
      try {
        if (messaging) {
          await messaging.send({
            topic: 'all',
            notification: { title: data.title, body: data.body }
          });
        }
        await prisma.notification.create({
          data: {
            userId: '000000000000000000000000', // System user or similar
            title: data.title,
            body: data.body,
            type: 'INFO',
            status: 'SENT'
          }
        }).catch(() => null);
        io.emit('receive_global_push', { title: data.title, body: data.body }); // Emit to mobile apps
        
        const totalUsers = await prisma.user.count();
        socket.emit('send_global_push_success', { count: totalUsers });
        
        // Tell UI to refresh notifications
        socket.emit('request_notifications');
      } catch (e) {
        console.error('Global push failed:', e);
      }
    });

    socket.on('broadcast_notification', async (data: any) => {
      try {
        const title = data.title || '📢 Cybersave Government Alert';
        const body = data.body || data.content || data.message || '';
        const pushTitle = title.startsWith('📢') ? title : `📢 ${title}`;
        const notifId = data.id || `NOTIF-${Date.now().toString(36).toUpperCase()}`;
        const notifType = data.priority === 'URGENT' || data.priority === 'HIGH' ? 'WARNING' : 'INFO';

        const pushPayload = {
          id: notifId,
          campaignId: notifId,
          title: pushTitle,
          body,
          message: body,
          content: body,
          type: notifType,
          priority: data.priority || 'HIGH',
          status: 'SENT',
          userId: 'all',
          createdAt: new Date().toISOString(),
          metadata: data
        };

        io.emit('receive_global_push', pushPayload);
        io.emit('user_push_notification', pushPayload);
        io.emit('new_notification', pushPayload);
        io.emit('campaign_created', pushPayload);
        io.emit('campaign_broadcast', pushPayload);
        io.emit('broadcast_notification', pushPayload);
        io.emit('notifications_updated');

        if (messaging) {
          messaging.send({
            topic: 'all',
            notification: { title: pushTitle, body },
            android: {
              priority: 'high',
              notification: {
                channelId: 'cybersave_alerts_channel',
                priority: 'max',
                defaultSound: true,
                defaultVibrateTimings: true,
                visibility: 'public',
                icon: 'ic_launcher'
              }
            }
          }).catch(() => null);
        }

        socket.emit('broadcast_notification_success', { success: true });
      } catch (e) {
        console.error('[Socket] broadcast_notification error:', e);
      }
    });

    socket.on('campaign_broadcast', async (data: any) => {
      try {
        io.emit('receive_global_push', data);
        io.emit('user_push_notification', data);
        io.emit('new_notification', data);
        io.emit('campaign_created', data);
        io.emit('campaign_broadcast', data);
        io.emit('broadcast_notification', data);
        io.emit('notifications_updated');
      } catch (e) {
        console.error('[Socket] campaign_broadcast error:', e);
      }
    });

    socket.on('request_support_tickets', async () => {
      try {
        const [tickets, refundRequests, feedbacks] = await Promise.all([
          prisma.supportTicket.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' },
            include: { user: { include: { profile: true } } }
          }),
          prisma.refundRequest.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' },
            include: { application: true, user: { include: { profile: true } } }
          }),
          prisma.feedback.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' },
            include: { user: { include: { profile: true } } }
          })
        ]);

        const formatted: any[] = tickets.map(t => {
          const reporterName = t.user?.profile?.fullName || (t.user?.email ? t.user.email.split('@')[0] : 'Citizen User');
          const reporterEmail = t.user?.email || '';
          const reporterId = t.user?.id || t.userId || 'citizen';
          const assignedName = typeof t.assignedTo === 'string' && t.assignedTo.trim() ? t.assignedTo : '';

          let ticketRating: number | undefined = undefined;
          let feedbackCat: string | undefined = undefined;
          if (t.category === 'Citizen Feedback' || t.refNumber?.startsWith('FDB-') || t.title?.includes('Feedback')) {
            const titleMatch = t.title?.match(/\((\d)★\)/);
            if (titleMatch && titleMatch[1]) {
              ticketRating = parseInt(titleMatch[1], 10);
            }
            if (t.title?.includes(':')) {
              feedbackCat = t.title.split(':').slice(1).join(':').trim();
            }
          }

          return {
            id: t.refNumber || `TKT-${t.id.substring(0, 8).toUpperCase()}`,
            rawId: t.id,
            refNumber: t.refNumber,
            title: t.title,
            description: t.description,
            category: t.category,
            priority: t.priority,
            rating: ticketRating,
            feedbackCategory: feedbackCat,
            createdOn: t.createdAt ? t.createdAt.toLocaleDateString('en-IN') : 'Today',
            lastUpdated: t.updatedAt ? t.updatedAt.toLocaleDateString('en-IN') : 'Today',
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            assignedTo: assignedName,
            assignedOfficer: assignedName ? { id: 'agent-01', name: assignedName } : null,
            reporter: { id: reporterId, name: reporterName, email: reporterEmail, phone: t.user?.phone || t.user?.profile?.phone || '' },
            user: t.user,
            status: t.status,
            attachmentUrl: t.attachmentUrl,
            messages: t.messages || [],
          };
        });


        const existingRefs = new Set(formatted.map(t => String(t.refNumber || t.id).toUpperCase()));

        // Merge Refund Requests
        for (const r of refundRequests) {
          const rRef = String(r.refNumber || `REF-${r.id.slice(-6)}`).toUpperCase();
          if (!existingRefs.has(rRef)) {
            existingRefs.add(rRef);
            const reporterName = r.user?.profile?.fullName || (r.user?.email ? r.user.email.split('@')[0] : 'Citizen Applicant');
            const reporterEmail = r.user?.email || '';
            const reporterPhone = r.user?.phone || r.user?.profile?.phone || '';
            const isApproved = r.status === 'APPROVED';
            const isRejected = r.status === 'REJECTED';

            formatted.push({
              id: r.refNumber,
              rawId: r.id,
              refNumber: r.refNumber,
              title: `Refund Claim: ₹${r.amount} - ${r.serviceTitle || r.application?.serviceTitle || 'Government Service Fee'}`,
              description: `Citizen requested refund for Application #${r.application?.refNumber || 'N/A'}.\nReason: ${r.reason}${r.details ? '\nDetails: ' + r.details : ''}`,
              category: 'Refund Request',
              priority: 'High',
              status: isApproved ? 'RESOLVED' : (isRejected ? 'RESOLVED' : 'OPEN'),
              createdOn: r.createdAt ? r.createdAt.toLocaleDateString('en-IN') : 'Today',
              lastUpdated: r.updatedAt ? r.updatedAt.toLocaleDateString('en-IN') : 'Today',
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
              attachmentUrl: r.proofUrl || null,
              assignedTo: '',
              assignedOfficer: null,
              reporter: { id: r.user?.id || r.userId || 'cit-user', name: reporterName, email: reporterEmail, phone: reporterPhone },
              user: r.user,
              refundAmount: r.amount,
              refundStatus: r.status,
              refundId: r.id,
              applicationId: r.applicationId,
              applicationRef: r.application?.refNumber,
              serviceTitle: r.serviceTitle || r.application?.serviceTitle,
              messages: [
                {
                  id: `msg-refund-${r.id}`,
                  senderId: r.user?.id || r.userId || 'citizen',
                  senderName: reporterName,
                  role: 'CITIZEN',
                  text: `Refund Request of ₹${r.amount} submitted for Application #${r.application?.refNumber || 'N/A'}.\n\nReason: ${r.reason}${r.details ? '\n\nDetails: ' + r.details : ''}`,
                  attachmentUrl: r.proofUrl || null,
                  time: r.createdAt ? r.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recent',
                  timestamp: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()
                },
                ...(isApproved ? [{
                  id: `msg-appr-${r.id}`,
                  senderId: 'support-desk',
                  senderName: 'Support Officer (SDM)',
                  role: 'AGENT',
                  text: `Refund Claim Approved! ₹${r.amount} has been officially re-credited to citizen digital wallet. ✓`,
                  time: r.updatedAt ? r.updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recent',
                  timestamp: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
                  isResolution: true
                }] : []),
                ...(isRejected ? [{
                  id: `msg-decl-${r.id}`,
                  senderId: 'support-desk',
                  senderName: 'Support Officer (SDM)',
                  role: 'AGENT',
                  text: `Refund Claim Declined: ${r.adminNotes || 'Declined by Administrator'}`,
                  time: r.updatedAt ? r.updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recent',
                  timestamp: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
                  isResolution: true
                }] : [])
              ]
            });
          }
        }

        // Merge Citizen Feedbacks
        for (const f of feedbacks) {
          const fbRef = `FDB-${f.id.slice(-6).toUpperCase()}`;
          const existing = formatted.find(t => String(t.refNumber || t.id).toUpperCase() === fbRef || String(t.rawId || '').toUpperCase() === f.id.toUpperCase());
          if (existing) {
            existing.rating = f.rating;
            existing.feedbackCategory = f.improvementCategory;
          } else if (!existingRefs.has(fbRef) && !existingRefs.has(f.id.toUpperCase())) {
            existingRefs.add(fbRef);
            const reporterName = f.user?.profile?.fullName || (f.user?.email ? f.user.email.split('@')[0] : 'Citizen User');
            const reporterEmail = f.user?.email || '';
            const reporterPhone = f.user?.phone || f.user?.profile?.phone || '';

            formatted.push({
              id: fbRef,
              rawId: f.id,
              refNumber: fbRef,
              title: `Citizen Feedback (${f.rating}★): ${f.improvementCategory || 'App Experience'}`,
              description: `"${f.feedbackText}"`,
              category: 'Citizen Feedback',
              priority: f.rating <= 2 ? 'High' : (f.rating === 3 ? 'Medium' : 'Low'),
              status: f.rating <= 2 ? 'OPEN' : 'RESOLVED',
              createdOn: f.createdAt ? f.createdAt.toLocaleDateString('en-IN') : 'Today',
              lastUpdated: f.updatedAt ? f.updatedAt.toLocaleDateString('en-IN') : 'Today',
              createdAt: f.createdAt,
              updatedAt: f.updatedAt,
              attachmentUrl: f.imageUrl || null,
              assignedTo: '',
              assignedOfficer: null,
              reporter: { id: f.user?.id || f.userId || 'cit-user', name: reporterName, email: reporterEmail, phone: reporterPhone },
              user: f.user,
              rating: f.rating,
              feedbackCategory: f.improvementCategory,
              messages: [
                {
                  id: `msg-fb-${f.id}`,
                  senderId: f.user?.id || f.userId || 'citizen',
                  senderName: reporterName,
                  role: 'CITIZEN',
                  text: `Rating: ${'★'.repeat(f.rating)}${'☆'.repeat(Math.max(0, 5 - f.rating))} (${f.rating}/5)\nCategory: ${f.improvementCategory || 'App Experience'}\n\nFeedback:\n"${f.feedbackText}"`,
                  attachmentUrl: f.imageUrl || null,
                  time: f.createdAt ? f.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recent',
                  timestamp: f.createdAt ? f.createdAt.toISOString() : new Date().toISOString()
                }
              ]
            });
          }
        }


        formatted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const totalTickets = formatted.length;
        const openTickets = formatted.filter(t => t.status === 'OPEN').length;
        const inProgress = formatted.filter(t => t.status === 'IN_PROGRESS').length;
        const resolved = formatted.filter(t => t.status === 'RESOLVED').length;

        socket.emit('response_support_tickets', {
          stats: { totalTickets, openTickets, inProgress, resolved },
          tickets: formatted
        });
      } catch (e) { console.error(e); }
    });

    socket.on('approve_refund', async (data: any) => {
      try {
        const targetId = String(data?.id || data?.refundId || data?.applicationId || '').trim();
        if (!targetId) return;
        const isMongo = /^[0-9a-fA-F]{24}$/.test(targetId);
        let refund = await prisma.refundRequest.findFirst({
          where: isMongo ? { OR: [{ id: targetId }, { refNumber: targetId }, { applicationId: targetId }] } : { refNumber: targetId }
        });
        if (!refund) return;

        const updatedRefund = await prisma.refundRequest.update({
          where: { id: refund.id },
          data: { status: 'APPROVED', updatedAt: new Date(), adminNotes: data?.notes || 'Approved by Admin' }
        });

        if (refund.applicationId) {
          await prisma.application.update({
            where: { id: refund.applicationId },
            data: { refundStatus: 'APPROVED', paymentStatus: 'Refunded', updatedAt: new Date() }
          }).catch(() => null);
        }

        if (refund.userId) {
          await prisma.wallet.upsert({
            where: { userId: refund.userId },
            update: { balance: { increment: refund.amount || 50 } },
            create: { userId: refund.userId, balance: refund.amount || 50 }
          }).catch(() => null);
        }

        await prisma.supportTicket.updateMany({
          where: {
            OR: [
              { refNumber: refund.refNumber },
              { id: refund.id },
              { title: { contains: refund.refNumber } }
            ]
          },
          data: { status: 'RESOLVED', updatedAt: new Date() }
        }).catch(() => null);

        io.emit('refund_approved', updatedRefund);
        io.emit('refunds_updated', updatedRefund);
        io.emit('support_tickets_updated');
        io.emit('applications_updated');
        io.emit('transactions_updated');
      } catch (e) {
        console.error('[Socket] approve_refund error:', e);
      }
    });

    socket.on('reject_refund', async (data: any) => {
      try {
        const targetId = String(data?.id || data?.refundId || data?.applicationId || '').trim();
        if (!targetId) return;
        const isMongo = /^[0-9a-fA-F]{24}$/.test(targetId);
        let refund = await prisma.refundRequest.findFirst({
          where: isMongo ? { OR: [{ id: targetId }, { refNumber: targetId }, { applicationId: targetId }] } : { refNumber: targetId }
        });
        if (!refund) return;

        const updatedRefund = await prisma.refundRequest.update({
          where: { id: refund.id },
          data: { status: 'REJECTED', updatedAt: new Date(), adminNotes: data?.reason || 'Declined by Administrator' }
        });

        if (refund.applicationId) {
          await prisma.application.update({
            where: { id: refund.applicationId },
            data: { refundStatus: 'REJECTED', updatedAt: new Date() }
          }).catch(() => null);
        }

        await prisma.supportTicket.updateMany({
          where: {
            OR: [
              { refNumber: refund.refNumber },
              { id: refund.id },
              { title: { contains: refund.refNumber } }
            ]
          },
          data: { status: 'RESOLVED', updatedAt: new Date() }
        }).catch(() => null);

        io.emit('refunds_updated', updatedRefund);
        io.emit('support_tickets_updated');
        io.emit('applications_updated');
      } catch (e) {
        console.error('[Socket] reject_refund error:', e);
      }
    });

    socket.on('request_ticket_thread', async (data: { id: string }) => {
      try {
        const thread = await formatSupportTicketThread(data?.id);
        socket.emit('response_ticket_thread', thread);
      } catch (e) {
        console.error('[Socket] request_ticket_thread error:', e);
        socket.emit('response_ticket_thread', null);
      }
    });

    socket.on('request_ticket_detail', async (data: { id: string }) => {
      try {
        const thread = await formatSupportTicketThread(data?.id);
        socket.emit('response_ticket_detail', thread);
      } catch (e) {
        console.error('[Socket] request_ticket_detail error:', e);
        socket.emit('response_ticket_detail', null);
      }
    });

    socket.on('send_ticket_reply', async (data: any) => {
      try {
        const targetId = String(data?.id || data?.rawId || data?.refNumber || data?.ticketId || '').trim();
        if (!targetId || !data?.text) return;
        const ticket = await findSupportTicketOrLinked(targetId);
        if (ticket) {
          const targetUserId = await resolveTicketTargetUserId(ticket);
          const replyText = String(data.text || '').trim();
          const existingMsgs = Array.isArray(ticket.messages) ? ticket.messages : [];

          // Guard against duplicate reply within 3.5s
          const isDuplicate = existingMsgs.some((m: any) =>
            m.text === replyText &&
            m.role === 'AGENT' &&
            (Date.now() - new Date(m.timestamp || 0).getTime() < 3500)
          );
          if (isDuplicate) return;

          const newMsg = {
            id: `msg-${Date.now()}`,
            senderId: data.adminId || 'admin-01',
            senderName: data.adminName || 'Support Desk Agent',
            role: 'AGENT',
            text: replyText,
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString()
          };
          const updatedMsgs = [...existingMsgs, newMsg];
          await prisma.supportTicket.update({
            where: { id: ticket.id },
            data: {
              messages: updatedMsgs,
              status: 'IN_PROGRESS',
              updatedAt: new Date(),
              ...(ticket.userId ? {} : targetUserId ? { userId: targetUserId } : {})
            }
          });

          await prisma.auditLog.create({
            data: {
              userId: (data.adminId && /^[0-9a-fA-F]{24}$/.test(data.adminId)) ? data.adminId : null,
              action: 'SUPPORT_TICKET_REPLIED',
              details: `Admin replied to ticket ${ticket.refNumber}: "${replyText.substring(0, 60)}..."`,
            }
          }).catch(() => null);

          // Dispatch notification to citizen
          await dispatchNotificationToCitizen({
            userId: targetUserId,
            title: `Official Response: Ticket #${ticket.refNumber || ticket.id} 💬`,
            body: replyText,
            type: 'INFO',
            metadata: {
              ticketId: ticket.id,
              refNumber: ticket.refNumber,
              senderName: data.adminName || 'Support Desk Agent',
              role: 'AGENT',
              text: replyText
            },
            io
          });

          const formatted = await formatSupportTicketThread(ticket.id);
          socket.emit('response_ticket_thread', formatted);
          socket.emit('response_ticket_detail', formatted);
          io.emit('support_tickets_updated');
          io.emit('new_ticket_message', {
            ticketId: ticket.refNumber,
            id: ticket.id,
            userId: targetUserId,
            userEmail: ticket.user?.email,
            userPhone: ticket.user?.phone,
            message: newMsg,
            ticket: formatted
          });
          io.emit('support_ticket_replied', {
            id: ticket.id,
            refNumber: ticket.refNumber,
            ticketId: ticket.refNumber,
            userId: targetUserId,
            userEmail: ticket.user?.email,
            userPhone: ticket.user?.phone,
            text: replyText,
            senderName: data.adminName || 'Support Desk Agent',
            role: 'AGENT',
            time: newMsg.time,
            timestamp: newMsg.timestamp,
            ticket: formatted
          });
          io.emit('user_grievance_reply', {
            userId: targetUserId,
            userEmail: ticket.user?.email,
            userPhone: ticket.user?.phone,
            ticketId: ticket.refNumber,
            ticketTitle: ticket.title,
            message: newMsg,
          });
          io.emit('response_ticket_thread', formatted);
          io.emit('response_ticket_detail', formatted);
        }
      } catch (e: any) {
        console.error('[Socket] send_ticket_reply error:', e);
      }
    });

    // Real-time typing indicators between Admin and Citizen
    socket.on('admin_typing', (data: { ticketId: string; adminName?: string; isTyping: boolean }) => {
      io.emit('admin_typing', {
        ticketId: data?.ticketId || 'all',
        adminName: data?.adminName || 'Support Desk Officer',
        isTyping: Boolean(data?.isTyping)
      });
    });

    socket.on('user_typing', (data: { ticketId: string; userId?: string; userName?: string; isTyping: boolean }) => {
      io.emit('user_typing', {
        ticketId: data?.ticketId || 'all',
        userId: data?.userId || 'citizen',
        userName: data?.userName || 'Citizen User',
        isTyping: Boolean(data?.isTyping)
      });
    });

    // Instant Mobile Citizen message via WebSocket
    socket.on('user_ticket_message', async (data: { ticketId: string; text: string; userId?: string; userName?: string; attachmentUrl?: string }) => {
      try {
        const targetId = String(data?.ticketId || '').trim();
        if ((!targetId && !data?.userId) || (!data?.text && !data?.attachmentUrl)) return;
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(targetId);
        let ticket: any = null;
        if (targetId) {
          if (isMongoId) {
            ticket = await prisma.supportTicket.findUnique({ where: { id: targetId }, include: { user: { include: { profile: true } } } });
          }
          if (!ticket) {
            ticket = await prisma.supportTicket.findFirst({ where: { refNumber: targetId }, include: { user: { include: { profile: true } } } });
          }
          if (!ticket) {
            ticket = await prisma.supportTicket.findFirst({
              where: {
                OR: [
                  { refNumber: { contains: targetId, mode: 'insensitive' } },
                  { id: { contains: targetId, mode: 'insensitive' } }
                ]
              },
              include: { user: { include: { profile: true } } }
            });
          }
        }

        // If ticket not found yet, check user latest ticket
        if (!ticket && data?.userId) {
          const isMongoU = /^[0-9a-fA-F]{24}$/.test(String(data.userId));
          const targetU = await prisma.user.findFirst({
            where: {
              OR: [
                ...(isMongoU ? [{ id: String(data.userId) }] : []),
                { email: String(data.userId).trim() },
                { phone: String(data.userId).trim() }
              ]
            }
          }).catch(() => null);
          if (targetU) {
            ticket = await prisma.supportTicket.findFirst({
              where: { userId: targetU.id },
              orderBy: { updatedAt: 'desc' },
              include: { user: { include: { profile: true } } }
            });
          }
        }

        // If still no ticket, create one instantly
        if (!ticket) {
          const newRef = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
          ticket = await prisma.supportTicket.create({
            data: {
              refNumber: newRef,
              userId: (/^[0-9a-fA-F]{24}$/.test(String(data?.userId))) ? String(data.userId) : null,
              title: (data.text || 'Grievance Query').slice(0, 40),
              description: data.text || 'Citizen message',
              category: 'Technical Support',
              priority: 'Medium',
              status: 'OPEN',
              messages: []
            },
            include: { user: { include: { profile: true } } }
          });
        }

        if (ticket) {
          const senderName = data.userName || ticket.user?.profile?.fullName || (ticket.user?.email ? ticket.user.email.split('@')[0] : 'Citizen User');
          const currentMsgs = Array.isArray(ticket.messages) ? ticket.messages : [];
          const newMsg = {
            id: `msg-${Date.now()}`,
            sender: senderName,
            senderName: senderName,
            role: 'CITIZEN',
            text: (data.text || '').trim(),
            attachmentUrl: data.attachmentUrl,
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString()
          };
          const updatedMsgs = [...currentMsgs, newMsg];
          await prisma.supportTicket.update({
            where: { id: ticket.id },
            data: {
              messages: updatedMsgs,
              status: 'OPEN',
              updatedAt: new Date()
            }
          });
          const formatted = await formatSupportTicketThread(ticket.id);
          io.emit('support_tickets_updated');
          io.emit('new_ticket_message', {
            ticketId: ticket.refNumber,
            id: ticket.id,
            sender: senderName,
            senderName: senderName,
            userId: ticket.userId,
            message: newMsg,
            ticket: formatted
          });
          io.emit('support_message_notification', {
            id: `notif-${Date.now()}`,
            ticketId: ticket.refNumber,
            ticketMongoId: ticket.id,
            senderName: senderName,
            text: newMsg.text,
            time: newMsg.time,
            timestamp: newMsg.timestamp,
          });
          io.emit('response_ticket_thread', formatted);
          io.emit('response_ticket_detail', formatted);
        }
      } catch (e: any) {
        console.error('[Socket] user_ticket_message error:', e);
      }
    });

    // Sub-millisecond mobile user tickets inquiry via WebSocket
    socket.on('request_user_tickets', async (data: { userId: string }) => {
      try {
        const userId = data?.userId;
        if (!userId) {
          socket.emit('response_user_tickets', { success: true, tickets: [] });
          return;
        }

        const cleanUserId = String(userId).trim();
        const isMongo = /^[0-9a-fA-F]{24}$/.test(cleanUserId);
        const userOrConditions: any[] = [];
        if (isMongo) userOrConditions.push({ id: cleanUserId });
        userOrConditions.push({ email: cleanUserId.toLowerCase() });
        userOrConditions.push({ email: cleanUserId });
        userOrConditions.push({ phone: cleanUserId });

        const digits = cleanUserId.replace(/\D/g, '').slice(-10);
        if (digits.length === 10) {
          userOrConditions.push({ phone: `+91${digits}` });
          userOrConditions.push({ phone: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` });
          userOrConditions.push({ phone: digits });
        }

        const targetUser = await prisma.user.findFirst({
          where: { OR: userOrConditions }
        }).catch(() => null);

        const orConditions: any[] = [];
        if (isMongo) orConditions.push({ userId: cleanUserId });
        if (targetUser?.id && /^[0-9a-fA-F]{24}$/.test(targetUser.id) && targetUser.id !== cleanUserId) {
          orConditions.push({ userId: targetUser.id });
        }

        let tickets: any[] = [];
        if (orConditions.length > 0) {
          tickets = await prisma.supportTicket.findMany({
            where: { OR: orConditions },
            orderBy: { createdAt: 'desc' },
          });
        }

        socket.emit('response_user_tickets', {
          success: true,
          tickets: tickets.map(t => ({
            id: t.id,
            refNumber: t.refNumber,
            title: t.title,
            description: t.description,
            category: t.category,
            priority: t.priority,
            status: t.status,
            attachmentUrl: t.attachmentUrl,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            messages: Array.isArray(t.messages) ? t.messages : [],
          }))
        });
      } catch (e) {
        console.error('[Socket] request_user_tickets error:', e);
        socket.emit('response_user_tickets', { success: false, tickets: [] });
      }
    });


    socket.on('resolve_support_ticket', async (data: any) => {
      try {
        const targetId = String(data?.id || '').trim();
        if (!targetId) return;
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(targetId);
        let ticket: any = null;
        if (isMongoId) {
          ticket = await prisma.supportTicket.findUnique({ where: { id: targetId }, include: { user: { include: { profile: true } } } });
        }
        if (!ticket) {
          ticket = await prisma.supportTicket.findFirst({ where: { refNumber: targetId }, include: { user: { include: { profile: true } } } });
        }
        if (!ticket) {
          ticket = await prisma.supportTicket.findFirst({
            where: {
              OR: [
                { refNumber: { contains: targetId, mode: 'insensitive' } },
                { id: { contains: targetId, mode: 'insensitive' } }
              ]
            },
            include: { user: { include: { profile: true } } }
          });
        }
        if (ticket) {
          const isRefundRelated = 
            ticket.category === 'Refund Request' ||
            String(ticket.refNumber || '').toUpperCase().startsWith('REF-') ||
            String(ticket.title || '').toLowerCase().includes('refund claim') ||
            String(ticket.title || '').toLowerCase().includes('refund request') ||
            targetId.toUpperCase().startsWith('REF-');

          if (isRefundRelated) {
            const isReject = data.isReject === true || data.action === 'REJECT' || data.resolutionCategory === 'Rejected';
            await processRefundApprovalOrRejection({
              refundIdOrRef: ticket.refNumber || targetId,
              action: isReject ? 'REJECT' : 'APPROVE',
              adminId: data.adminId,
              adminName: data.adminName,
              adminNotes: data.resolutionSummary || (isReject ? 'Declined by Administrator' : 'Refund approved and credited to wallet'),
              io
            }).catch(err => {
              console.warn('[Socket resolve_support_ticket] processRefundApprovalOrRejection error:', err);
            });

            const formatted = await formatSupportTicketThread(ticket.id);
            socket.emit('resolve_ticket_success', formatted);
            io.emit('support_tickets_updated');
            io.emit('response_ticket_thread', formatted);
            io.emit('response_ticket_detail', formatted);
            return;
          }

          const targetUserId = await resolveTicketTargetUserId(ticket);
          const resolutionSummary = data.resolutionSummary || 'Grievance verification completed. Issue marked as resolved.';

          const existingMsgs = Array.isArray(ticket.messages) ? ticket.messages : [];
          const hasRecentResolution = existingMsgs.some((m: any) => 
            m.isResolution && 
            (Date.now() - new Date(m.timestamp || 0).getTime() < 3500)
          );

          if (!hasRecentResolution) {
            const resolutionMsg = {
              id: `msg-resolve-${Date.now()}`,
              senderId: data.adminId || 'admin-01',
              senderName: `${data.adminName || 'Support Desk Officer'} (Official Resolution)`,
              role: 'AGENT',
              text: `✅ Grievance Ticket #${ticket.refNumber || ticket.id} has been marked as RESOLVED by the administrative verification officer.\nResolution: ${resolutionSummary}`,
              time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              timestamp: new Date().toISOString(),
              isResolution: true
            };
            const updatedMsgs = [...existingMsgs, resolutionMsg];

            await prisma.supportTicket.update({
              where: { id: ticket.id },
              data: {
                status: 'RESOLVED',
                messages: updatedMsgs,
                updatedAt: new Date(),
                ...(ticket.userId ? {} : targetUserId ? { userId: targetUserId } : {})
              }
            });

            await prisma.auditLog.create({
              data: {
                userId: (data.adminId && /^[0-9a-fA-F]{24}$/.test(data.adminId)) ? data.adminId : (targetUserId || null),
                action: 'SUPPORT_TICKET_RESOLVED',
                details: `Ticket #${ticket.refNumber} marked as resolved: ${resolutionSummary}`,
              }
            }).catch(() => null);

            // Dispatch notification to citizen
            await dispatchNotificationToCitizen({
              userId: targetUserId,
              title: 'Support Ticket Resolved ✅',
              body: `Admin has resolved your grievance ticket #${ticket.refNumber || ticket.id}: "${resolutionSummary}"`,
              type: 'SUCCESS',
              metadata: {
                ticketId: ticket.id,
                refNumber: ticket.refNumber,
                status: 'RESOLVED',
                category: data.resolutionCategory || ticket.category,
                rootCause: data.rootCause,
                summary: resolutionSummary
              },
              io
            });
          }

          const formatted = await formatSupportTicketThread(ticket.id);
          socket.emit('resolve_ticket_success', formatted);
          io.emit('support_tickets_updated');
          io.emit('support_ticket_resolved', {
            ...formatted,
            userId: targetUserId,
            resolutionSummary,
            status: 'RESOLVED'
          });
          io.emit('user_grievance_reply', {
            userId: targetUserId,
            userEmail: ticket.user?.email,
            userPhone: ticket.user?.phone,
            ticketId: ticket.refNumber,
            ticketTitle: ticket.title,
            message: {
              role: 'AGENT',
              senderName: `${data.adminName || 'Support Desk Officer'} (Official Resolution)`,
              text: `✅ Grievance Ticket #${ticket.refNumber || ticket.id} has been marked as RESOLVED.\nResolution: ${resolutionSummary}`,
              time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              isResolution: true
            }
          });
          io.emit('response_ticket_thread', formatted);
          io.emit('response_ticket_detail', formatted);
        }
      } catch (e) {
        console.error('[Socket] resolve_support_ticket error:', e);
      }
    });

    socket.on('create_refund_request', async (payload: any) => {
      try {
        const result = await createRefundAndSupportTicket({
          applicationId: payload.applicationId,
          reason: payload.reason,
          details: payload.details,
          proofUrl: payload.proofUrl,
          userId: payload.userId,
          io
        });
        socket.emit('create_refund_request_success', result);
      } catch (e: any) {
        console.error('[Socket] create_refund_request error:', e);
        socket.emit('create_refund_request_error', { error: e.message });
      }
    });

    socket.on('approve_refund', async (payload: any) => {
      try {
        const result = await processRefundApprovalOrRejection({
          refundIdOrRef: payload.id || payload.refundId || payload.refNumber,
          action: 'APPROVE',
          adminId: payload.adminId,
          adminName: payload.adminName,
          adminNotes: payload.adminNotes,
          io
        });
        socket.emit('approve_refund_success', result);
      } catch (e: any) {
        console.error('[Socket] approve_refund error:', e);
        socket.emit('approve_refund_error', { error: e.message });
      }
    });

    socket.on('reject_refund', async (payload: any) => {
      try {
        const result = await processRefundApprovalOrRejection({
          refundIdOrRef: payload.id || payload.refundId || payload.refNumber,
          action: 'REJECT',
          adminId: payload.adminId,
          adminName: payload.adminName,
          adminNotes: payload.adminNotes,
          io
        });
        socket.emit('reject_refund_success', result);
      } catch (e: any) {
        console.error('[Socket] reject_refund error:', e);
        socket.emit('reject_refund_error', { error: e.message });
      }
    });

    socket.on('create_support_ticket', async (data: { title: string, category: string, priority: string, description: string, attachmentUrl?: string }) => {
      try {
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const refNumber = `TKT-${randomNum}`;
        const newTicket = await prisma.supportTicket.create({
          data: {
            refNumber,
            title: data.title || 'Support Ticket',
            description: data.description || '',
            category: data.category || 'Technical Support',
            priority: data.priority || 'Medium',
            status: 'OPEN',
            attachmentUrl: data.attachmentUrl || null,
            assignedTo: (data as any).assignedTo || null,
            userId: (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))?.id || null,
          }
        });

        socket.emit('create_support_ticket_success');
        io.emit('new_support_ticket', {
          id: newTicket.refNumber,
          rawId: newTicket.id,
          refNumber: newTicket.refNumber,
          title: newTicket.title,
          description: newTicket.description,
          category: newTicket.category,
          priority: newTicket.priority,
          status: newTicket.status,
          assignedTo: newTicket.assignedTo,
          attachmentUrl: newTicket.attachmentUrl,
          createdOn: newTicket.createdAt.toLocaleDateString('en-IN'),
        });
        io.emit('support_tickets_updated');
      } catch (e) {
        console.error('Failed to create ticket', e);
      }
    });

    socket.on('request_analytics', async () => {
      try {
        const [totalApps, pendingApps, approvedApps, rejectedApps, allApps, totalDocs, realTxnData] = await Promise.all([
          prisma.application.count(),
          prisma.application.count({ where: { status: { in: ['SUBMITTED', 'VERIFYING', 'PENDING'] } } }),
          prisma.application.count({ where: { status: { in: ['APPROVED', 'COMPLETED'] } } }),
          prisma.application.count({ where: { status: 'REJECTED' } }),
          fetchApplicationsWithUsers({}, 100),
          prisma.documentUpload.count(),
          fetchRealTransactionsData()
        ]);

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chartDays = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dayName = days[d.getDay()];
          const dateYMD = d.toISOString().slice(0, 10);
          d.setHours(0, 0, 0, 0);
          const nextD = new Date(d);
          nextD.setDate(nextD.getDate() + 1);

          const dayApps = allApps.filter(a => {
            const at = new Date(a.submittedAt);
            return at >= d && at < nextD;
          });

          const breakdownEntry = realTxnData.stats.dailyBreakdown?.[dateYMD];
          const dayRev = breakdownEntry ? breakdownEntry.net : dayApps.reduce((sum, a) => sum + (a.feePaid || 50), 0);

          return {
            day: dayName,
            date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            submissions: dayApps.length,
            verified: dayApps.filter(a => a.status === 'APPROVED' || a.status === 'COMPLETED').length,
            revenue: dayRev
          };
        });

        socket.emit('response_analytics', {
          stats: {
            totalSubmissions: totalApps,
            verifiedCount: approvedApps,
            verified: approvedApps,
            pendingCount: pendingApps,
            pendingReview: pendingApps,
            rejectedCount: rejectedApps,
            rejected: rejectedApps,
            totalFeeCollected: realTxnData.stats.totalAmount,
            grossInflow: realTxnData.stats.grossInflow,
            totalRefundsDeducted: realTxnData.stats.refundedAmount,
            revenueToday: realTxnData.stats.revenueToday,
            totalUploads: totalDocs,
            complianceRate: '99.98%',
            avgTurnAround: '14.2 Hours'
          },
          chartDays,
          categories: [
            { name: 'Identity & Certificates', count: Math.round(totalApps * 0.4) },
            { name: 'Revenue & Land Records', count: Math.round(totalApps * 0.35) },
            { name: 'Welfare Schemes', count: Math.round(totalApps * 0.25) }
          ],
          statusDistribution: {
            verified: approvedApps,
            pending: pendingApps,
            rejected: rejectedApps
          }
        });
      } catch (e) { console.error('[Socket] request_analytics error:', e); }
    });

    async function getSocketFastAuditLogs() {
      if (socketAuditLogsCache && Date.now() - socketAuditLogsCache.timestamp < 15000) {
        return socketAuditLogsCache.data;
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.findMany({
          take: 100,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            userId: true,
            action: true,
            details: true,
            ipAddress: true,
            createdAt: true
          }
        })
      ]);

      const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))] as string[];
      const userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { fullName: true } }
          }
        });
        users.forEach(u => userMap.set(u.id, u));
      }

      const formatted = logs.map(l => {
        const u = l.userId ? userMap.get(l.userId) : null;
        return {
          id: l.id,
          timestamp: l.createdAt.toISOString().replace('T', ' ').substring(0, 19),
          user: u?.profile?.fullName || (u?.email ? u.email.split('@')[0] : 'System Admin'),
          userEmail: u?.email || '',
          action: l.action,
          resource: l.details || '-',
          details: l.details || '-',
          ipAddress: l.ipAddress || '106.222.215.137',
          status: (l.action && l.action.toLowerCase().includes('reject')) ? 'Failed' :
                  (l.action && l.action.toLowerCase().includes('warn')) ? 'Warning' : 'Success'
        };
      });

      const resData = {
        stats: { totalEvents: total, loginActivities: Math.round(total * 0.4), documentActions: total, systemChanges: Math.round(total * 0.15) },
        logs: formatted
      };

      socketAuditLogsCache = { data: resData, timestamp: Date.now() };
      return resData;
    }

    socket.on('request_audit_logs', async () => {
      try {
        const resData = await getSocketFastAuditLogs();
        socket.emit('response_audit_logs', resData);
      } catch (e) { console.error('[Socket] request_audit_logs error:', e); }
    });

    socket.on('request_admin_profile', async (data?: { id?: string; email?: string }) => {
      try {
        const adminEmail = data?.email || 'admin@cybersave.com';
        let adminUser = await prisma.user.findFirst({
          where: { OR: [{ email: adminEmail }, { role: 'ADMIN' }] },
          include: { profile: true }
        });
        if (adminUser) {
          socket.emit('response_admin_profile', {
            id: adminUser.id,
            name: adminUser.profile?.fullName || 'Super Administrator',
            email: adminUser.email,
            phone: adminUser.phone || adminUser.profile?.phone || '+91 98765 43210',
            avatarUrl: adminUser.profile?.avatarUrl || null,
            role: 'Super Admin',
            permissions: adminUser.permissions || ['SUPER_ADMIN', 'ALL']
          });
        }
      } catch (e) {
        console.error('[Socket] request_admin_profile error:', e);
      }
    });

    socket.on('update_admin_profile', async (data: any) => {
      try {
        const adminEmail = data?.email || 'admin@cybersave.com';
        let adminUser = await prisma.user.findFirst({
          where: { OR: [{ email: adminEmail }, { role: 'ADMIN' }] },
          include: { profile: true }
        });
        if (adminUser) {
          if (data.phone) {
            await prisma.user.update({
              where: { id: adminUser.id },
              data: { phone: data.phone }
            });
          }
          if (adminUser.profile) {
            await prisma.profile.update({
              where: { id: adminUser.profile.id },
              data: {
                fullName: data.name || adminUser.profile.fullName,
                phone: data.phone || adminUser.profile.phone,
                avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : adminUser.profile.avatarUrl
              }
            });
          } else {
            await prisma.profile.create({
              data: {
                userId: adminUser.id,
                fullName: data.name || 'Super Administrator',
                phone: data.phone || '',
                avatarUrl: data.avatarUrl || null
              }
            });
          }
          const updated = {
            id: adminUser.id,
            name: data.name || adminUser.profile?.fullName || 'Super Administrator',
            email: adminUser.email,
            phone: data.phone || adminUser.phone || '',
            avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : adminUser.profile?.avatarUrl,
            role: 'Super Admin',
            permissions: adminUser.permissions || ['SUPER_ADMIN', 'ALL']
          };
          socket.emit('admin_profile_updated', updated);
          socket.emit('response_admin_profile', updated);
          io.emit('admin_profile_updated', updated);
        }
      } catch (e) {
        console.error('[Socket] update_admin_profile error:', e);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

function formatCitizenSocketPayload(u: any) {
  if (!u) return null;
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
    u.aadhaarDocs.forEach((d: any) => {
      docList.push({
        id: d.id,
        name: `${d.documentType || 'Aadhaar Document'}.pdf`,
        fileUrl: d.documentUrl || null,
        date: d.verifiedAt ? new Date(d.verifiedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
        status: d.verificationStatus === 'SUCCESS' ? 'Verified' : (d.verificationStatus || 'Uploaded'),
      });
    });
  }

  const recentServices = apps.slice(0, 8).map((a: any) => ({
    id: a.id,
    refNumber: a.refNumber,
    name: a.serviceTitle || (a.service ? a.service.title : 'Government Scheme Service'),
    date: a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
    amount: a.feePaid ? `₹${a.feePaid}` : '₹50',
    rawAmount: a.feePaid || 50,
    status: a.status === 'APPROVED' || a.status === 'COMPLETED' ? 'Completed' : (a.status === 'IN_PROGRESS' ? 'In Progress' : (a.status === 'REJECTED' ? 'Rejected' : 'Pending')),
  }));

  const recentActivity = (u.auditLogs || []).slice(0, 8).map((l: any) => ({
    id: l.id,
    title: l.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
    details: l.details || '',
    date: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
    color: l.action.includes('REJECT') || l.action.includes('BLOCK') ? '#EF4444' : (l.action.includes('APPROV') || l.action.includes('SUCCESS') ? '#10B981' : '#2563EB'),
  }));

  return {
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
      assignedOperator: apps.find((a: any) => isRealOfficer(a.officialOfficer))?.officialOfficer || '',
    },
    recentServices,
    uploadedDocuments: docList,
    recentActivity,
    applications: recentServices,
    documents: docList,
    auditLogs: recentActivity,
  };
}

