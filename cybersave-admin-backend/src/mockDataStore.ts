/**
 * CyberSave Enterprise Resilient In-Memory & Database Cache Store
 * Contains authentic, interconnected data models for all portal views.
 */

export interface CachedApplication {
  id: string;
  refNumber: string;
  userId: string;
  serviceId?: string;
  serviceTitle: string;
  serviceCategory?: string;
  status: string;
  priority?: string;
  rejectionReason?: string | null;
  estimatedCompletion?: string;
  officialOfficer?: string;
  feePaid: number;
  paymentStatus: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  formData: any;
  documents: any[];
  submittedAt: Date;
  updatedAt: Date;
  refundStatus?: string | null;
  service?: any;
  user?: any;
}

export interface CachedCitizen {
  id: string;
  email: string;
  phone: string;
  status: string;
  isOnline: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  profile: {
    fullName: string;
    phone: string;
    email: string;
    district: string;
    state: string;
    dob: string;
    gender: string;
    address: string;
    pinCode: string;
    aadhaarNumber?: string;
    avatarUrl?: string | null;
  };
}

export interface CachedOperator {
  id: string;
  vleCode: string;
  name: string;
  centreName: string;
  district: string;
  state: string;
  phone: string;
  email: string;
  status: string;
  rating: number;
  totalApplications: number;
  activeToday: number;
  slaAdherence: string;
}

export interface CachedSupportTicket {
  id: string;
  refNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    sender: 'citizen' | 'admin' | 'system';
    senderName: string;
    text: string;
    timestamp: string;
  }>;
}

export interface CachedAuditLog {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  ipAddress?: string;
  createdAt: Date;
}

// ─── Verified SVG Generator for Official Documents ───────────────────────────
function makeGovProofSvg(title: string, certId: string, citizenName: string, dept: string = 'Digital Public Services Authority') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1050" viewBox="0 0 800 1050">
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="25" y="25" width="750" height="1000" rx="12" fill="#fafafa" stroke="#1768ff" stroke-width="3" />
    <rect x="40" y="40" width="720" height="970" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
    <rect x="40" y="40" width="720" height="110" fill="#1e3a8a" rx="8 8 0 0" />
    <text x="400" y="85" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">NATIONAL E-GOVERNANCE SERVICES PORTAL</text>
    <text x="400" y="120" font-family="Arial, sans-serif" font-size="14" fill="#93c5fd" text-anchor="middle">${dept} • CyberSave Verified Ledger</text>
    <text x="400" y="200" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#0f172a" text-anchor="middle">${title}</text>
    <line x1="100" y1="225" x2="700" y2="225" stroke="#cbd5e1" stroke-width="1.5" />
    <rect x="80" y="255" width="640" height="320" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="110" y="295" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#64748b">RECORD IDENTIFIER:</text>
    <text x="320" y="295" font-family="Courier, monospace" font-size="15" font-weight="bold" fill="#1768ff">${certId}</text>
    <text x="110" y="345" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#64748b">BENEFICIARY / CITIZEN:</text>
    <text x="320" y="345" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${citizenName}</text>
    <text x="110" y="395" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#64748b">AUTHORIZATION STATUS:</text>
    <text x="320" y="395" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#16a34a">✓ OFFICIALLY VALIDATED RECORD</text>
    <text x="110" y="445" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#64748b">ISSUING AUTHORITY:</text>
    <text x="320" y="445" font-family="Arial, sans-serif" font-size="14" fill="#334155">${dept}</text>
    <circle cx="600" cy="740" r="65" fill="none" stroke="#16a34a" stroke-width="3" stroke-dasharray="4,4" />
    <text x="600" y="735" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#16a34a" text-anchor="middle">DIGITALLY SIGNED</text>
    <text x="600" y="755" font-family="Arial, sans-serif" font-size="10" fill="#16a34a" text-anchor="middle">CyberSave Authority</text>
    <line x1="80" y1="920" x2="720" y2="920" stroke="#e2e8f0" stroke-width="1" />
    <text x="400" y="960" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">CyberSave Enterprise Security • Digitally Certified Document Dossier #${certId}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ─── Authentic Citizen Profiles ───────────────────────────────────────────────
export const CITIZENS: CachedCitizen[] = [
  {
    id: '65f1a2b3c4d5e6f7a8b9c0d1',
    email: 'mohd.aathiff@gmail.com',
    phone: '+91 98450 12893',
    status: 'ACTIVE',
    isOnline: true,
    lastSeenAt: new Date(),
    createdAt: new Date(Date.now() - 45 * 86400000),
    profile: {
      fullName: 'Mohd Aathiff',
      phone: '+91 98450 12893',
      email: 'mohd.aathiff@gmail.com',
      district: 'Bangalore Urban',
      state: 'Karnataka',
      dob: '14/06/1998',
      gender: 'Male',
      address: '4th Cross, Koramangala 5th Block, Bengaluru',
      pinCode: '560095',
      aadhaarNumber: '•••• •••• 8912',
      avatarUrl: null
    }
  },
  {
    id: '65f1a2b3c4d5e6f7a8b9c0d2',
    email: 'rajesh.kumar@gmail.com',
    phone: '+91 98765 43210',
    status: 'ACTIVE',
    isOnline: true,
    lastSeenAt: new Date(),
    createdAt: new Date(Date.now() - 30 * 86400000),
    profile: {
      fullName: 'Rajesh Kumar',
      phone: '+91 98765 43210',
      email: 'rajesh.kumar@gmail.com',
      district: 'Central Delhi',
      state: 'Delhi',
      dob: '15/08/1990',
      gender: 'Male',
      address: 'House No. 42, Connaught Place, New Delhi',
      pinCode: '110001',
      aadhaarNumber: '•••• •••• 4219',
      avatarUrl: null
    }
  },
  {
    id: '65f1a2b3c4d5e6f7a8b9c0d3',
    email: 'priya.sharma@outlook.com',
    phone: '+91 98123 45678',
    status: 'ACTIVE',
    isOnline: true,
    lastSeenAt: new Date(),
    createdAt: new Date(Date.now() - 25 * 86400000),
    profile: {
      fullName: 'Priya Sharma',
      phone: '+91 98123 45678',
      email: 'priya.sharma@outlook.com',
      district: 'South Delhi',
      state: 'Delhi',
      dob: '22/11/1995',
      gender: 'Female',
      address: 'Flat 304, Saket Enclave, New Delhi',
      pinCode: '110017',
      aadhaarNumber: '•••• •••• 7823',
      avatarUrl: null
    }
  },
  {
    id: '65f1a2b3c4d5e6f7a8b9c0d4',
    email: 'anita.verma@example.com',
    phone: '+91 99887 11223',
    status: 'ACTIVE',
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 3600000),
    createdAt: new Date(Date.now() - 20 * 86400000),
    profile: {
      fullName: 'Anita Verma',
      phone: '+91 99887 11223',
      email: 'anita.verma@example.com',
      district: 'North West Delhi',
      state: 'Delhi',
      dob: '08/03/1986',
      gender: 'Female',
      address: 'Shop 14, Main Market, Rohini Sector 7, Delhi',
      pinCode: '110085',
      aadhaarNumber: '•••• •••• 5512',
      avatarUrl: null
    }
  },
  {
    id: '65f1a2b3c4d5e6f7a8b9c0d5',
    email: 'amit.verma@yahoo.com',
    phone: '+91 97654 32109',
    status: 'ACTIVE',
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 7200000),
    createdAt: new Date(Date.now() - 15 * 86400000),
    profile: {
      fullName: 'Amit Verma',
      phone: '+91 97654 32109',
      email: 'amit.verma@yahoo.com',
      district: 'North East Delhi',
      state: 'Delhi',
      dob: '10/04/1988',
      gender: 'Male',
      address: 'B-12, Yamuna Vihar, Delhi',
      pinCode: '110053',
      aadhaarNumber: '•••• •••• 9104',
      avatarUrl: null
    }
  },
  {
    id: '65f1a2b3c4d5e6f7a8b9c0d6',
    email: 'sunita.devi@rediffmail.com',
    phone: '+91 96543 21098',
    status: 'ACTIVE',
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 14400000),
    createdAt: new Date(Date.now() - 10 * 86400000),
    profile: {
      fullName: 'Sunita Devi',
      phone: '+91 96543 21098',
      email: 'sunita.devi@rediffmail.com',
      district: 'West Delhi',
      state: 'Delhi',
      dob: '05/01/1975',
      gender: 'Female',
      address: 'Plot 78, Janakpuri, New Delhi',
      pinCode: '110058',
      aadhaarNumber: '•••• •••• 3341',
      avatarUrl: null
    }
  }
];

// ─── Authentic Applications Dataset ──────────────────────────────────────────
export const APPLICATIONS: CachedApplication[] = [
  {
    id: '65f1b1c2d3e4f5a6b7c8d901',
    refNumber: 'CSB2026982472',
    userId: '65f1a2b3c4d5e6f7a8b9c0d2',
    serviceTitle: 'Income Certificate',
    serviceCategory: 'Certificates',
    priority: 'High',
    status: 'SUBMITTED',
    rejectionReason: null,
    estimatedCompletion: '3-5 Business Days',
    officialOfficer: 'Principal Verification Officer (SDM)',
    feePaid: 30,
    paymentStatus: 'Success',
    razorpayOrderId: 'order_CSB982472',
    razorpayPaymentId: 'pay_982472_success',
    razorpaySignature: 'sig_CSB982472',
    formData: {
      fullName: 'Rajesh Kumar',
      email: 'rajesh.kumar@gmail.com',
      phone: '+91 98765 43210',
      fatherName: 'Ram Kumar',
      annualIncome: '₹1,80,000',
      occupation: 'Salaried Employee',
      district: 'Central Delhi',
      state: 'Delhi',
      pinCode: '110001',
      address: 'House No. 42, Connaught Place, New Delhi',
      purpose: 'Higher Education Scholarship & Fee Concession'
    },
    documents: [
      {
        label: 'Aadhaar Card Copy',
        fileName: 'aadhaar_card_proof.pdf',
        fileUrl: makeGovProofSvg('Income Certificate - Aadhaar Proof', 'CSB2026982472', 'Rajesh Kumar', 'UIDAI & Revenue Dept'),
        type: 'Identity Proof',
        size: '1.2 MB'
      },
      {
        label: 'Salary Statement / Form 16',
        fileName: 'salary_statement.pdf',
        fileUrl: makeGovProofSvg('Income Certificate - Salary Proof', 'CSB2026982472', 'Rajesh Kumar', 'Revenue Department'),
        type: 'Financial Proof',
        size: '2.4 MB'
      }
    ],
    submittedAt: new Date(Date.now() - 15 * 60000), // 15 mins ago
    updatedAt: new Date(Date.now() - 15 * 60000),
    user: CITIZENS[1]
  },
  {
    id: '65f1b1c2d3e4f5a6b7c8d902',
    refNumber: 'CSB2026743912',
    userId: '65f1a2b3c4d5e6f7a8b9c0d3',
    serviceTitle: 'Driving License (DL)',
    serviceCategory: 'Transport',
    priority: 'Medium',
    status: 'VERIFYING',
    rejectionReason: null,
    estimatedCompletion: '7-10 Business Days',
    officialOfficer: 'RTO Assistant Commissioner',
    feePaid: 200,
    paymentStatus: 'Success',
    razorpayOrderId: 'order_CSB743912',
    razorpayPaymentId: 'pay_743912_success',
    formData: {
      fullName: 'Priya Sharma',
      email: 'priya.sharma@outlook.com',
      phone: '+91 98123 45678',
      vehicleClass: 'LMV (Light Motor Vehicle - 4 Wheeler)',
      learnerLicenseNo: 'DL-042025008912',
      district: 'South Delhi',
      state: 'Delhi',
      pinCode: '110017',
      address: 'Flat 304, Saket Enclave, New Delhi'
    },
    documents: [
      {
        label: 'Learner License Copy',
        fileName: 'learner_license.pdf',
        fileUrl: makeGovProofSvg('Driving License - Learner License', 'CSB2026743912', 'Priya Sharma', 'Ministry of Road Transport & Highways'),
        type: 'Transport Proof',
        size: '1.8 MB'
      }
    ],
    submittedAt: new Date(Date.now() - 45 * 60000), // 45 mins ago
    updatedAt: new Date(Date.now() - 45 * 60000),
    user: CITIZENS[2]
  },
  {
    id: '65f1b1c2d3e4f5a6b7c8d903',
    refNumber: 'CSB2026889124',
    userId: '65f1a2b3c4d5e6f7a8b9c0d2',
    serviceTitle: 'PM-KISAN Samman Nidhi Scheme',
    serviceCategory: 'Schemes',
    priority: 'High',
    status: 'APPROVED',
    rejectionReason: null,
    estimatedCompletion: 'Completed',
    officialOfficer: 'District Agriculture Officer',
    feePaid: 50,
    paymentStatus: 'Success',
    formData: {
      fullName: 'Rajesh Kumar Patel',
      email: 'rajesh.kumar@gmail.com',
      phone: '+91 98765 43210',
      state: 'Uttar Pradesh',
      district: 'Varanasi',
      landRecordNumber: 'UP-VAR-2024-88912',
      khasraNumber: '142/B',
      bankAccountNumber: '•••• •••• 1928',
      ifscCode: 'SBIN0001234'
    },
    documents: [
      {
        label: 'Land Ownership Record (Khatauni)',
        fileName: 'khatauni_record.pdf',
        fileUrl: makeGovProofSvg('PM-KISAN - Land Record (Khatauni)', 'CSB2026889124', 'Rajesh Kumar Patel', 'Ministry of Agriculture & Farmers Welfare'),
        type: 'Land Proof',
        size: '2.1 MB'
      }
    ],
    submittedAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
    updatedAt: new Date(Date.now() - 30 * 60000),
    user: CITIZENS[1]
  },
  {
    id: '65f1b1c2d3e4f5a6b7c8d904',
    refNumber: 'CSB2026518293',
    userId: '65f1a2b3c4d5e6f7a8b9c0d5',
    serviceTitle: 'Aadhaar Update Address',
    serviceCategory: 'Aadhaar',
    priority: 'Medium',
    status: 'IN_PROGRESS',
    rejectionReason: null,
    estimatedCompletion: '2-4 Business Days',
    officialOfficer: 'UIDAI Verification Registrar',
    feePaid: 50,
    paymentStatus: 'Success',
    formData: {
      fullName: 'Amit Verma',
      email: 'amit.verma@yahoo.com',
      phone: '+91 97654 32109',
      aadhaarNumber: '•••• •••• 9104',
      newAddress: 'B-12, Yamuna Vihar, Delhi - 110053',
      district: 'North East Delhi',
      state: 'Delhi'
    },
    documents: [
      {
        label: 'Electricity Bill Proof',
        fileName: 'electricity_bill.pdf',
        fileUrl: makeGovProofSvg('Aadhaar Address Update Proof', 'CSB2026518293', 'Amit Verma', 'Unique Identification Authority of India (UIDAI)'),
        type: 'Address Proof',
        size: '1.5 MB'
      }
    ],
    submittedAt: new Date(Date.now() - 5 * 3600000), // 5 hours ago
    updatedAt: new Date(Date.now() - 5 * 3600000),
    user: CITIZENS[4]
  },
  {
    id: '65f1b1c2d3e4f5a6b7c8d905',
    refNumber: 'CSB2026102948',
    userId: '65f1a2b3c4d5e6f7a8b9c0d1',
    serviceTitle: 'Fresh Passport Application',
    serviceCategory: 'Passport',
    priority: 'Critical',
    status: 'REJECTED',
    rejectionReason: 'Address proof document is blur and could not be verified by the regional passport officer. Please upload an official electricity bill or registered rent agreement.',
    estimatedCompletion: 'Closed',
    officialOfficer: 'Passport Seva Officer (MEA)',
    feePaid: 1500,
    paymentStatus: 'Refund Dispatched',
    refundStatus: 'DISPATCHED',
    formData: {
      fullName: 'Mohd Aathiff',
      email: 'mohd.aathiff@gmail.com',
      phone: '+91 98450 12893',
      passportType: 'Fresh 36 Pages Normal',
      district: 'Bangalore Urban',
      state: 'Karnataka'
    },
    documents: [
      {
        label: 'Address Proof Copy',
        fileName: 'address_proof.jpg',
        fileUrl: makeGovProofSvg('Passport - Address Proof Copy', 'CSB2026102948', 'Mohd Aathiff', 'Ministry of External Affairs (PSP)'),
        type: 'Address Proof',
        size: '1.1 MB'
      }
    ],
    submittedAt: new Date(Date.now() - 24 * 3600000), // 1 day ago
    updatedAt: new Date(Date.now() - 4 * 3600000),
    user: CITIZENS[0]
  },
  {
    id: '65f1b1c2d3e4f5a6b7c8d906',
    refNumber: 'CSB2026654321',
    userId: '65f1a2b3c4d5e6f7a8b9c0d4',
    serviceTitle: 'Commercial Trade License',
    serviceCategory: 'Commercial',
    priority: 'High',
    status: 'REJECTED',
    rejectionReason: 'Incomplete Address Proof: Shop rent agreement is expired (dated 2022). Please upload a valid renewed lease agreement and NOC from fire department.',
    estimatedCompletion: 'Closed',
    officialOfficer: 'Municipal Licensing Officer',
    feePaid: 120,
    paymentStatus: 'Refund Pending',
    refundStatus: 'PENDING',
    formData: {
      fullName: 'Anita Verma',
      email: 'anita.verma@example.com',
      phone: '+91 99887 11223',
      businessName: 'Verma Grocery & Organic Retail',
      tradeType: 'Retail Food & Commodities',
      gstNumber: '07AAAAA0000A1Z5',
      shopAddress: 'Shop 14, Main Market, Rohini Sector 7, Delhi',
      district: 'North West Delhi',
      state: 'Delhi'
    },
    documents: [
      {
        label: 'Shop Lease & Rent Agreement',
        fileName: 'shop_lease.pdf',
        fileUrl: makeGovProofSvg('Commercial Trade License - Lease Proof', 'CSB2026654321', 'Anita Verma', 'Municipal Corporation of Delhi'),
        type: 'Tenancy Proof',
        size: '1.9 MB'
      }
    ],
    submittedAt: new Date(Date.now() - 36 * 3600000), // 1.5 days ago
    updatedAt: new Date(Date.now() - 10 * 3600000),
    user: CITIZENS[3]
  }
];

// ─── Authentic Operators ──────────────────────────────────────────────────────
export const OPERATORS: CachedOperator[] = [
  {
    id: 'op_1',
    vleCode: 'VLE-0234',
    name: 'Vikram Tiwari',
    centreName: 'CSC Central Seva Kendra #101',
    district: 'Central Delhi',
    state: 'Delhi',
    phone: '+91 98112 33445',
    email: 'vikram.tiwari@cybersave.in',
    status: 'Active',
    rating: 4.9,
    totalApplications: 142,
    activeToday: 18,
    slaAdherence: '98%'
  },
  {
    id: 'op_2',
    vleCode: 'VLE-0451',
    name: 'Rajesh Verma',
    centreName: 'South Delhi Citizen Digital Hub',
    district: 'South Delhi',
    state: 'Delhi',
    phone: '+91 98223 44556',
    email: 'rajesh.verma@cybersave.in',
    status: 'Active',
    rating: 4.8,
    totalApplications: 98,
    activeToday: 12,
    slaAdherence: '96%'
  },
  {
    id: 'op_3',
    vleCode: 'VLE-0782',
    name: 'Suresh Patel',
    centreName: 'Rohini Digital e-Seva Kendra',
    district: 'North West Delhi',
    state: 'Delhi',
    phone: '+91 98334 55667',
    email: 'suresh.patel@cybersave.in',
    status: 'Active',
    rating: 5.0,
    totalApplications: 165,
    activeToday: 24,
    slaAdherence: '99%'
  },
  {
    id: 'op_4',
    vleCode: 'VLE-0119',
    name: 'Anita Sharma',
    centreName: 'Janakpuri Civic Services Desk',
    district: 'West Delhi',
    state: 'Delhi',
    phone: '+91 98445 66778',
    email: 'anita.sharma@cybersave.in',
    status: 'Active',
    rating: 4.7,
    totalApplications: 84,
    activeToday: 9,
    slaAdherence: '94%'
  }
];

// ─── Authentic Support Tickets ────────────────────────────────────────────────
export const SUPPORT_TICKETS: CachedSupportTicket[] = [
  {
    id: 'tkt_1',
    refNumber: 'TKT-2026-001',
    userId: '65f1a2b3c4d5e6f7a8b9c0d2',
    userName: 'Rajesh Kumar',
    userEmail: 'rajesh.kumar@gmail.com',
    userPhone: '+91 98765 43210',
    title: 'Income Certificate Document Clarification',
    description: 'Applicant uploaded Form 16 and inquiring if Tehsildar requires physical presence for stamp verification.',
    category: 'Application Query',
    priority: 'High',
    status: 'IN_PROGRESS',
    assignedTo: 'Officer Sharma (SDM)',
    createdAt: new Date(Date.now() - 3 * 3600000),
    updatedAt: new Date(Date.now() - 1 * 3600000),
    messages: [
      {
        sender: 'citizen',
        senderName: 'Rajesh Kumar',
        text: 'Hello, I have submitted my Form 16 and Salary Slips for Income Certificate #CSB2026982472. Do I need to visit the SDM office in person?',
        timestamp: new Date(Date.now() - 3 * 3600000).toISOString()
      },
      {
        sender: 'admin',
        senderName: 'Officer Sharma (SDM)',
        text: 'Namaste Rajesh. Under the CyberSave paperless e-District integration, physical presence is NOT required. Your certificate will be issued digitally with a valid QR code.',
        timestamp: new Date(Date.now() - 1 * 3600000).toISOString()
      }
    ]
  },
  {
    id: 'tkt_2',
    refNumber: 'TKT-2026-002',
    userId: '65f1a2b3c4d5e6f7a8b9c0d1',
    userName: 'Mohd Aathiff',
    userEmail: 'mohd.aathiff@gmail.com',
    userPhone: '+91 98450 12893',
    title: 'Refund Status for Rejected Passport Application',
    description: 'Inquiring regarding refund dispatch to Razorpay source account for ₹1,500.',
    category: 'Billing & Refunds',
    priority: 'Critical',
    status: 'RESOLVED',
    assignedTo: 'Finance Desk',
    createdAt: new Date(Date.now() - 24 * 3600000),
    updatedAt: new Date(Date.now() - 2 * 3600000),
    messages: [
      {
        sender: 'citizen',
        senderName: 'Mohd Aathiff',
        text: 'My application #CSB2026102948 was rejected due to address proof blur. Has the refund of ₹1,500 been processed?',
        timestamp: new Date(Date.now() - 24 * 3600000).toISOString()
      },
      {
        sender: 'admin',
        senderName: 'Finance Desk',
        text: 'Refund #REF-20261029 for ₹1,500.00 has been approved and dispatched back to your original payment method. Reference ARN: RZP98241029.',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString()
      }
    ]
  }
];

// ─── Real Audit Logs ─────────────────────────────────────────────────────────
export const AUDIT_LOGS: CachedAuditLog[] = [
  {
    id: 'log_1',
    userName: 'Principal Verification Officer (SDM)',
    userEmail: 'sdm.central@cybersave.in',
    action: 'APPLICATION_SUBMITTED',
    details: 'New Application #CSB2026982472 received for Income Certificate by citizen Rajesh Kumar.',
    ipAddress: '192.168.31.18',
    createdAt: new Date(Date.now() - 15 * 60000)
  },
  {
    id: 'log_2',
    userName: 'District Agriculture Officer',
    userEmail: 'agri.delhi@cybersave.in',
    action: 'APPLICATION_APPROVED',
    details: 'Application #CSB2026889124 for PM-KISAN Samman Nidhi officially APPROVED. Digital certificate authorized.',
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 30 * 60000)
  },
  {
    id: 'log_3',
    userName: 'Municipal Licensing Officer',
    userEmail: 'mcd.trade@cybersave.in',
    action: 'APPLICATION_REJECTED',
    details: 'Application #CSB2026654321 for Commercial Trade License REJECTED. Reason: Expired shop lease.',
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 10 * 3600000)
  },
  {
    id: 'log_4',
    userName: 'Super Administrator',
    userEmail: 'admin@cybersave.com',
    action: 'SETTLEMENT_PROCESSED',
    details: 'Daily settlement batch realized for ₹1,329.00 across all digital public services.',
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 24 * 3600000)
  }
];

// Active In-Memory Store
class MockDataStore {
  private applications: Map<string, CachedApplication> = new Map();
  private citizens: Map<string, CachedCitizen> = new Map();
  private operators: Map<string, CachedOperator> = new Map();
  private tickets: Map<string, CachedSupportTicket> = new Map();
  private auditLogs: CachedAuditLog[] = [...AUDIT_LOGS];

  constructor() {
    CITIZENS.forEach(c => this.citizens.set(c.id, c));
    APPLICATIONS.forEach(a => {
      this.applications.set(a.id, a);
      this.applications.set(a.refNumber, a);
    });
    OPERATORS.forEach(o => this.operators.set(o.id, o));
    SUPPORT_TICKETS.forEach(t => {
      this.tickets.set(t.id, t);
      this.tickets.set(t.refNumber, t);
    });
  }

  public getApplications(filter?: { status?: string; userId?: string }): CachedApplication[] {
    const list = Array.from(new Set(this.applications.values()));
    return list.filter(app => {
      if (filter?.status && filter.status !== 'All') {
        if (app.status.toUpperCase() !== filter.status.toUpperCase()) return false;
      }
      if (filter?.userId && filter.userId !== 'all') {
        if (app.userId !== filter.userId && app.user?.id !== filter.userId && app.user?.phone !== filter.userId && app.user?.email !== filter.userId) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  public getApplicationById(idOrRef: string): CachedApplication | null {
    if (!idOrRef) return null;
    const clean = idOrRef.trim();
    if (this.applications.has(clean)) return this.applications.get(clean)!;
    for (const app of this.applications.values()) {
      if (app.id === clean || app.refNumber.toUpperCase() === clean.toUpperCase()) {
        return app;
      }
    }
    return null;
  }

  public addApplication(app: CachedApplication) {
    this.applications.set(app.id, app);
    this.applications.set(app.refNumber, app);
    if (app.user && !this.citizens.has(app.user.id)) {
      this.citizens.set(app.user.id, app.user);
    }
    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      userName: app.user?.profile?.fullName || 'Citizen Applicant',
      userEmail: app.user?.email || 'citizen@cybersave.in',
      action: 'APPLICATION_SUBMITTED',
      details: `New Application #${app.refNumber} submitted for ${app.serviceTitle}.`,
      ipAddress: '127.0.0.1',
      createdAt: new Date()
    });
  }

  public updateApplicationStatus(idOrRef: string, status: string, rejectionReason?: string | null) {
    const app = this.getApplicationById(idOrRef);
    if (app) {
      app.status = status.toUpperCase();
      app.updatedAt = new Date();
      if (rejectionReason !== undefined) {
        app.rejectionReason = rejectionReason;
      }
      this.applications.set(app.id, app);
      this.applications.set(app.refNumber, app);
      this.auditLogs.unshift({
        id: `log_${Date.now()}`,
        userName: 'Administrative Officer',
        userEmail: 'admin@cybersave.com',
        action: `APPLICATION_${status.toUpperCase()}`,
        details: `Application #${app.refNumber} (${app.serviceTitle}) updated to ${status.toUpperCase()}.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        ipAddress: '127.0.0.1',
        createdAt: new Date()
      });
      return app;
    }
    return null;
  }

  public getCitizens(): CachedCitizen[] {
    return Array.from(this.citizens.values());
  }

  public getCitizenById(idOrEmailOrPhone: string): CachedCitizen | null {
    const clean = idOrEmailOrPhone.trim().toLowerCase();
    for (const c of this.citizens.values()) {
      if (
        c.id === idOrEmailOrPhone ||
        c.id.includes(idOrEmailOrPhone) ||
        c.email.toLowerCase() === clean ||
        c.phone.includes(clean) ||
        c.profile.phone.includes(clean) ||
        c.profile.fullName.toLowerCase().includes(clean)
      ) {
        return c;
      }
    }
    return null;
  }

  public getOperators(): CachedOperator[] {
    return Array.from(this.operators.values());
  }

  public getOperatorById(id: string): CachedOperator | null {
    return this.operators.get(id) || null;
  }

  public getSupportTickets(): CachedSupportTicket[] {
    return Array.from(new Set(this.tickets.values())).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getSupportTicketById(idOrRef: string): CachedSupportTicket | null {
    const clean = idOrRef.trim();
    if (this.tickets.has(clean)) return this.tickets.get(clean)!;
    for (const t of this.tickets.values()) {
      if (t.id === clean || t.refNumber.toUpperCase() === clean.toUpperCase()) return t;
    }
    return null;
  }

  public getAuditLogs(): CachedAuditLog[] {
    return [...this.auditLogs];
  }
}

export const mockDataStore = new MockDataStore();
