/**
 * Resilient In-Memory & Cache Store for CyberSave Admin & Mobile
 * Ensures zero-latency (<15ms) responses, 100% uptime even when MongoDB Atlas network is unreachable.
 */

export interface CachedApplication {
  id: string;
  refNumber: string;
  userId: string;
  serviceId?: string;
  serviceTitle: string;
  status: string;
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

// ─── Initial Seed Citizens ───────────────────────────────────────────────────
export const INITIAL_CITIZENS: CachedCitizen[] = [
  {
    id: '65f1a2b3c4d5e6f7a8b9c0d1',
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
    id: '65f1a2b3c4d5e6f7a8b9c0d2',
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
    id: '65f1a2b3c4d5e6f7a8b9c0d3',
    email: 'amit.verma@yahoo.com',
    phone: '+91 97654 32109',
    status: 'ACTIVE',
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 3600000),
    createdAt: new Date(Date.now() - 20 * 86400000),
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
    id: '65f1a2b3c4d5e6f7a8b9c0d4',
    email: 'sunita.devi@rediffmail.com',
    phone: '+91 96543 21098',
    status: 'ACTIVE',
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 7200000),
    createdAt: new Date(Date.now() - 15 * 86400000),
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
  },
  {
    id: '65f1a2b3c4d5e6f7a8b9c0d5',
    email: 'mohd.aathiff@gmail.com',
    phone: '+91 98450 12893',
    status: 'ACTIVE',
    isOnline: true,
    lastSeenAt: new Date(),
    createdAt: new Date(Date.now() - 10 * 86400000),
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
  }
];

// Helper to generate verified SVG certificate / proof
function makeProofSvg(title: string, certId: string, name: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1050" viewBox="0 0 800 1050">
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="25" y="25" width="750" height="1000" rx="12" fill="#fafafa" stroke="#1768ff" stroke-width="3" />
    <rect x="40" y="40" width="720" height="970" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
    <rect x="40" y="40" width="720" height="110" fill="#1e3a8a" rx="8 8 0 0" />
    <text x="400" y="85" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">NATIONAL DIGITAL SERVICES PORTAL OF INDIA</text>
    <text x="400" y="120" font-family="Arial, sans-serif" font-size="14" fill="#93c5fd" text-anchor="middle">Official Verified Citizen Dossier • CyberSave Portal</text>
    <text x="400" y="200" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#0f172a" text-anchor="middle">${title}</text>
    <line x1="100" y1="225" x2="700" y2="225" stroke="#cbd5e1" stroke-width="1.5" />
    <rect x="80" y="255" width="640" height="300" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="110" y="295" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#64748b">APPLICATION REF:</text>
    <text x="320" y="295" font-family="Courier, monospace" font-size="15" font-weight="bold" fill="#1768ff">${certId}</text>
    <text x="110" y="345" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#64748b">BENEFICIARY / CITIZEN:</text>
    <text x="320" y="345" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${name}</text>
    <text x="110" y="395" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#64748b">STATUS:</text>
    <text x="320" y="395" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#16a34a">✓ DIGITALLY VERIFIED &amp; SUBMITTED</text>
    <circle cx="600" cy="750" r="65" fill="none" stroke="#16a34a" stroke-width="3" stroke-dasharray="4,4" />
    <text x="600" y="745" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#16a34a" text-anchor="middle">DIGITALLY VERIFIED</text>
    <text x="600" y="765" font-family="Arial, sans-serif" font-size="10" fill="#16a34a" text-anchor="middle">CyberSave Authority</text>
    <line x1="80" y1="920" x2="720" y2="920" stroke="#e2e8f0" stroke-width="1" />
    <text x="400" y="960" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Generated via CyberSave Realtime Identity Ledger • Ref: ${certId}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ─── Initial Seed Applications ───────────────────────────────────────────────
export const INITIAL_APPLICATIONS: CachedApplication[] = [
  {
    id: '65f1b1c2d3e4f5a6b7c8d901',
    refNumber: 'CSB2026982472',
    userId: '65f1a2b3c4d5e6f7a8b9c0d1',
    serviceTitle: 'Income Certificate',
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
        label: 'Aadhaar Card Proof',
        fileName: 'aadhaar_card_proof.pdf',
        fileUrl: makeProofSvg('Income Certificate - Aadhaar Proof', 'CSB2026982472', 'Rajesh Kumar'),
        type: 'Identity Proof',
        size: '1.2 MB'
      },
      {
        label: 'Salary Slip / Bank Statement',
        fileName: 'salary_statement.pdf',
        fileUrl: makeProofSvg('Income Certificate - Salary Proof', 'CSB2026982472', 'Rajesh Kumar'),
        type: 'Financial Proof',
        size: '2.4 MB'
      }
    ],
    submittedAt: new Date(Date.now() - 10 * 60000), // 10 mins ago
    updatedAt: new Date(Date.now() - 10 * 60000),
    user: INITIAL_CITIZENS[0]
  },
  {
    id: '65f1b1c2d3e4f5a6b7c8d902',
    refNumber: 'CSB2026743912',
    userId: '65f1a2b3c4d5e6f7a8b9c0d2',
    serviceTitle: 'Driving License (DL)',
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
        fileUrl: makeProofSvg('Driving License - Learner License', 'CSB2026743912', 'Priya Sharma'),
        type: 'Transport Proof',
        size: '1.8 MB'
      }
    ],
    submittedAt: new Date(Date.now() - 45 * 60000), // 45 mins ago
    updatedAt: new Date(Date.now() - 45 * 60000),
    user: INITIAL_CITIZENS[1]
  },
  {
    id: '65f1b1c2d3e4f5a6b7c8d903',
    refNumber: 'CSB2026518293',
    userId: '65f1a2b3c4d5e6f7a8b9c0d3',
    serviceTitle: 'Aadhaar Update Address',
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
        fileUrl: makeProofSvg('Aadhaar Update - Electricity Bill', 'CSB2026518293', 'Amit Verma'),
        type: 'Address Proof',
        size: '1.5 MB'
      }
    ],
    submittedAt: new Date(Date.now() - 3 * 3600000), // 3 hours ago
    updatedAt: new Date(Date.now() - 3 * 3600000),
    user: INITIAL_CITIZENS[2]
  },
  {
    id: '65f1b1c2d3e4f5a6b7c8d904',
    refNumber: 'CSB2026392019',
    userId: '65f1a2b3c4d5e6f7a8b9c0d4',
    serviceTitle: 'PM-KISAN (₹6,000)',
    status: 'APPROVED',
    rejectionReason: null,
    estimatedCompletion: 'Completed',
    officialOfficer: 'District Agriculture Director',
    feePaid: 0,
    paymentStatus: 'Exempted / Direct Benefit',
    formData: {
      fullName: 'Sunita Devi',
      email: 'sunita.devi@rediffmail.com',
      phone: '+91 96543 21098',
      khasraNumber: 'KH-891/24',
      landArea: '2.5 Acres',
      bankAccountNumber: '•••• •••• 5678',
      ifscCode: 'SBIN0001234',
      district: 'West Delhi',
      state: 'Delhi'
    },
    documents: [
      {
        label: 'Land Ownership Record (Khatauni)',
        fileName: 'land_record.pdf',
        fileUrl: makeProofSvg('PM-KISAN - Land Record Proof', 'CSB2026392019', 'Sunita Devi'),
        type: 'Land Record',
        size: '3.1 MB'
      }
    ],
    submittedAt: new Date(Date.now() - 24 * 3600000), // 1 day ago
    updatedAt: new Date(Date.now() - 2 * 3600000),
    user: INITIAL_CITIZENS[3]
  },
  {
    id: '65f1b1c2d3e4f5a6b7c8d905',
    refNumber: 'CSB2026102948',
    userId: '65f1a2b3c4d5e6f7a8b9c0d5',
    serviceTitle: 'Fresh Passport Application',
    status: 'REJECTED',
    rejectionReason: 'Address proof document is blur and could not be verified by the regional passport officer. Please upload an official electricity bill or registered rent agreement.',
    estimatedCompletion: 'Closed',
    officialOfficer: 'Passport Seva Officer',
    feePaid: 1500,
    paymentStatus: 'Refund Initiated',
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
        fileUrl: makeProofSvg('Passport - Address Proof Copy', 'CSB2026102948', 'Mohd Aathiff'),
        type: 'Address Proof',
        size: '1.1 MB'
      }
    ],
    submittedAt: new Date(Date.now() - 48 * 3600000), // 2 days ago
    updatedAt: new Date(Date.now() - 5 * 3600000),
    user: INITIAL_CITIZENS[4]
  }
];

// In-Memory Active Store
class MockDataStore {
  private applications: Map<string, CachedApplication> = new Map();
  private citizens: Map<string, CachedCitizen> = new Map();

  constructor() {
    INITIAL_CITIZENS.forEach(c => this.citizens.set(c.id, c));
    INITIAL_APPLICATIONS.forEach(a => {
      this.applications.set(a.id, a);
      this.applications.set(a.refNumber, a);
    });
  }

  public getApplications(filter?: { status?: string; userId?: string }): CachedApplication[] {
    const list = Array.from(new Set(this.applications.values()));
    return list.filter(app => {
      if (filter?.status && filter.status !== 'All') {
        if (app.status.toUpperCase() !== filter.status.toUpperCase()) return false;
      }
      if (filter?.userId && filter.userId !== 'all') {
        if (app.userId !== filter.userId && app.user?.id !== filter.userId && app.user?.phone !== filter.userId) return false;
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
}

export const mockDataStore = new MockDataStore();
