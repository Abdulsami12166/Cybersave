import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger('AiService');
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.initGemini();
  }

  private initGemini(): boolean {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_KEY;

    if (apiKey && !this.genAI) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
        });
        this.logger.log('Gemini AI Service initialized successfully for CyberBot.');
        return true;
      } catch (error) {
        this.logger.error('Failed to initialize Gemini AI Client', error);
        return false;
      }
    }
    return !!this.model;
  }

  private async generateText(
    prompt: string,
    systemInstruction?: string,
  ): Promise<string> {
    this.initGemini();

    if (this.model) {
      const fallbackModels = [
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
        'gemini-pro',
      ];

      for (const modelName of fallbackModels) {
        try {
          const modelInstance = this.genAI?.getGenerativeModel({
            model: modelName,
          });
          if (!modelInstance) continue;

          const fullPrompt = systemInstruction
            ? `${systemInstruction}\n\nUser Question: ${prompt}\n\nProvide a structured, helpful, step-by-step answer as CyberBot:`
            : prompt;

          const result = await modelInstance.generateContent(fullPrompt);
          const response = await result.response;
          const text = response.text().trim();
          if (text) {
            return text;
          }
        } catch (error) {
          this.logger.warn(
            `Gemini generation failed on model ${modelName}, trying next fallback: ${error.message}`,
          );
        }
      }
    }

    return this.getComprehensiveKnowledgeResponse(prompt);
  }

  async chat(userId: string, message: string): Promise<string> {
    let userName = 'Citizen';
    if (userId && userId !== 'default-user-id') {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { profile: true },
        });
        if (user?.profile?.fullName) {
          userName = user.profile.fullName;
        } else if (user?.email) {
          userName = user.email.split('@')[0];
        }
      } catch (e) {
        this.logger.warn('Failed to fetch user name for AI prompt', e);
      }
    }

    const systemInstruction = `You are CyberBot, the official and intelligent AI assistant for Cybersave (National Government & Digital Public Services Portal of India).
You are assisting citizen "${userName}".
Your role is to provide accurate, comprehensive, step-by-step guidance on ALL Indian Government and Digital Public Services, including:
1. Aadhaar Services: Online address update, mobile linking, e-Aadhaar PDF download, PVC card order, Biometric lock/unlock, Name/DOB change, e-KYC.
2. PAN Card Services: Fresh PAN (Form 49A), PAN-Aadhaar linking, corrections in PAN data, duplicate reprint, instant e-PAN.
3. Government Certificates: Income certificate, Caste certificate (SC/ST/OBC/EWS), Domicile/Residence certificate, Birth & Death certificates, Marriage certificate, Character certificate, Non-Creamy Layer (NCL).
4. Transport & Driving: Learner's License (LL), Permanent Driving License (DL), RC Transfer, Vehicle Fitness, Traffic E-Challan payment, Fastag.
5. Welfare Schemes: PM-Kisan (₹6,000/yr benefit), Ayushman Bharat PM-JAY (₹5 Lakh free health cover), PM Awas Yojana (PMAY housing), PM SVANidhi (street vendor loan), Sukanya Samriddhi (SSY), Atal Pension Yojana (APY), PM Suraksha Bima (PMSBY), PM Jeevan Jyoti (PMJJBY), National Scholarship Portal (NSP), Ration Card (NFSA).
6. EPFO & Pension: PF balance check, PF withdrawal, UAN activation, EPS pension, Jeevan Pramaan digital life certificate.
7. Taxes & Business: ITR e-filing (ITR-1 to ITR-4), GST registration, Udyam / MSME registration, FSSAI food license.
8. Utility Bills: Electricity, Water, LPG cylinder booking, Broadband & Landline bills via BBPS.
9. Cybersave App Features: Cybersave Wallet (1-click zero-fee payments), Document Locker (encrypted vault), Real-time Application Tracker, Support Tickets.

Instructions for formatting your response:
- Start with a warm greeting (e.g. "Namaste ${userName}!").
- Provide clear, structured bullet points covering:
  1. Eligibility & Requirements
  2. Required Documents
  3. Step-by-Step Application Process (both in the Cybersave App and Official Portals)
  4. Official Fee & Processing Time (SLA)
- Keep responses clear, concise, accurate, and easy to read.`;

    return this.generateText(message, systemInstruction);
  }

  public getComprehensiveKnowledgeResponse(prompt: string): string {
    const q = (prompt || '').toLowerCase().trim();

    // 1. Aadhaar Address Update
    if (
      q.includes('address') ||
      (q.includes('update') && q.includes('aadhaar')) ||
      q.includes('change address')
    ) {
      return `Namaste! Here is how to update your Address on your Aadhaar Card via Cybersave:

📋 Required Documents (Any One):
• Electricity / Water / Piped Gas bill (less than 3 months old)
• Registered Rent Agreement or Bank Passbook with photo
• Voter ID card, Passport, or Post Office Account Statement

📲 How to Apply in Cybersave:
1. Open the Cybersave App and tap "Aadhaar Services" on the Home Screen.
2. Select "Update Address Online".
3. Enter your 12-digit Aadhaar number and verify with the OTP sent to your linked mobile.
4. Enter your new address details carefully (Pin code, District, State, Street/House No).
5. Upload a clear photo/PDF of your address proof.
6. Pay the government fee (₹50) using Cybersave Wallet or UPI.
7. You will receive an Update Request Number (URN) to track the live status.

⏱️ Processing Time: 3 to 7 working days. Once approved, you can download your updated e-Aadhaar directly in the app!`;
    }

    // 2. Aadhaar Linking / Mobile / PVC / Download / Biometric
    if (
      q.includes('aadhaar') ||
      q.includes('uidai') ||
      q.includes('okyc') ||
      q.includes('biometric') ||
      q.includes('pvc card')
    ) {
      if (q.includes('pvc') || q.includes('plastic card')) {
        return `Namaste! Here is how to order an official Aadhaar PVC Card:

💳 What is Aadhaar PVC: A pocket-sized, weather-proof PVC card with a secure QR code and hologram issued directly by UIDAI.
💰 Official Fee: ₹50 (inclusive of GST and Speed Post delivery).

📲 Steps to Order in Cybersave:
1. Tap "Aadhaar Services" -> "Order Aadhaar PVC Card".
2. Enter your 12-digit Aadhaar or 28-digit Enrollment ID.
3. Authenticate with OTP on your registered mobile number.
4. Pay ₹50 via Cybersave Wallet or UPI.
5. The PVC card will be printed and delivered to your registered address within 7-10 working days via India Post.`;
      }

      if (q.includes('mobile') || q.includes('phone') || q.includes('link mobile')) {
        return `Namaste! Here is how to link or update your mobile number with Aadhaar:

ℹ️ Important: Biometric authentication (fingerprint/iris) is mandatory by UIDAI for mobile number linking.

📲 Process:
1. Open Cybersave -> "Aadhaar Services" -> "Book Aadhaar Centre Appointment".
2. Select your nearest Cybersave / CSC Aadhaar Seva Kendra.
3. Choose a convenient date & time slot.
4. Visit the centre with your Aadhaar card (no other documents required for mobile update).
5. Complete fingerprint verification. Government fee is ₹50.
6. Your mobile number will be updated within 24-48 hours.`;
      }

      if (q.includes('download') || q.includes('pdf') || q.includes('e-aadhaar')) {
        return `Namaste! Here is how to download your official e-Aadhaar PDF:

📲 Steps in Cybersave:
1. Go to "Aadhaar Services" -> "Download e-Aadhaar".
2. Enter your 12-digit Aadhaar number or 14-digit Enrolment ID.
3. Enter the OTP sent to your registered mobile.
4. Choose Regular or Masked Aadhaar (masks first 8 digits for privacy).
5. Tap Download.
🔑 PDF Password format: First 4 letters of your Name in CAPITAL letters followed by your Year of Birth (e.g. if Name is SURESH and Year is 1990, Password is SURE1990).`;
      }

      return `Namaste! Cybersave provides complete digital Aadhaar Services:
• Update Address Online (upload address proof & pay ₹50)
• Link Mobile Number & Email (book appointment at nearest centre)
• Download e-Aadhaar PDF (instant password-protected download)
• Order Aadhaar PVC Card (₹50 official speed post delivery)
• Biometric Lock / Unlock (secure fingerprints against unauthorized misuse)
• Virtual ID (VID) Generation & Paperless e-KYC

Tap "Aadhaar Services" on the Home Screen to get started!`;
    }

    // 3. PAN Card & Linking
    if (
      q.includes('pan') ||
      q.includes('link pan') ||
      q.includes('income tax') ||
      q.includes('form 49a')
    ) {
      if (q.includes('link') || q.includes('aadhaar')) {
        return `Namaste! Here is how to Link your PAN Card with your Aadhaar:

⚠️ Mandatory Requirement: All individual PAN cards must be linked with Aadhaar as per Income Tax guidelines.

📲 How to Link via Cybersave:
1. Tap "PAN Services" -> "Link PAN with Aadhaar".
2. Enter your 10-digit PAN number and 12-digit Aadhaar number.
3. Verify that your Name, Gender, and Date of Birth match on both documents.
4. Enter the Aadhaar OTP received on your mobile.
5. If linking after the deadline, pay the applicable challan fee (₹1,000) via Cybersave Wallet/UPI.
6. Submit the request. Status will update to 'Linked' within 24-48 hours.`;
      }

      return `Namaste! Here is how to apply for a New PAN Card (Form 49A) or Correction:

📋 Required Documents:
• Proof of Identity: Aadhaar Card / Voter ID / Passport
• Proof of Address: Aadhaar Card / Utility Bill / Bank Statement
• Proof of Date of Birth: Aadhaar Card / Birth Certificate / 10th Marksheet
• 2 Passport Size Photos (if physical mode) or Paperless Aadhaar e-KYC

📲 Steps in Cybersave:
1. Go to "PAN Services" -> "Apply for New PAN (Form 49A)".
2. Choose Digital Mode (instant paperless via Aadhaar) or Physical Card delivery.
3. Fill applicant details (Name, Father's Name, DOB, Income Source).
4. Upload documents (or complete instant Aadhaar OTP verification).
5. Pay government fee (₹107 for physical card, ₹72 for e-PAN).
6. e-PAN is delivered to your email in 2-3 hours; physical card arrives in 7-10 days.`;
    }

    // 4. Certificates (Income, Caste, Domicile, Birth, Death, Marriage, NCL)
    if (
      q.includes('certificate') ||
      q.includes('income') ||
      q.includes('caste') ||
      q.includes('domicile') ||
      q.includes('residence') ||
      q.includes('birth') ||
      q.includes('death') ||
      q.includes('marriage') ||
      q.includes('non creamy')
    ) {
      if (q.includes('income')) {
        return `Namaste! Here is how to apply for a Government Income Certificate:

📋 Required Documents:
• Identity Proof (Aadhaar Card / Voter ID)
• Address Proof (Ration Card / Electricity Bill)
• Income Proof (Salary Slip, Form 16, ITR, or Self-Declaration Affidavit from Tehsildar)
• Passport-size photograph

📲 How to Apply in Cybersave:
1. Open Cybersave -> "Certificates" -> "Income Certificate".
2. Select your State and District.
3. Fill in family members, annual income from all sources (Agriculture, Business, Salary).
4. Upload the supporting documents.
5. Pay application fee (₹30-₹55 depending on state) from Cybersave Wallet.
6. Revenue Inspector / Tehsildar will verify within 3-5 working days.
7. Download digitally signed certificate with QR code directly in the app!`;
      }

      if (q.includes('caste') || q.includes('sc') || q.includes('st') || q.includes('obc') || q.includes('ews')) {
        return `Namaste! Here is how to apply for a Caste / Category Certificate (SC/ST/OBC/EWS):

📋 Required Documents:
• Applicant's Aadhaar Card & Passport Photo
• Father's/Grandfather's Caste Certificate or ancestral land revenue record (pre-1950 for SC/ST, pre-1993 for OBC)
• Address Proof (Ration Card / Electricity Bill)
• Self-declaration Affidavit

📲 How to Apply in Cybersave:
1. Tap "Certificates" -> "Caste Certificate".
2. Choose your category: SC, ST, OBC, or EWS.
3. Enter personal and parental lineage details.
4. Upload identity and ancestral caste proof.
5. Submit and track live verification status.
6. The digitally signed certificate will be issued by the SDM/Tehsildar office within 7-15 days.`;
      }

      if (q.includes('domicile') || q.includes('residence') || q.includes('niwas')) {
        return `Namaste! Here is how to apply for a Domicile / Residence Certificate:

📋 Required Documents:
• Aadhaar Card & Passport size photo
• Proof of continuous residence (Ration Card, Electricity Bill, or Rent Agreement for 10-15 years)
• Educational proof (School Leaving Certificate / Marksheet from the state)

📲 How to Apply in Cybersave:
1. Go to "Certificates" -> "Domicile Certificate".
2. Enter your state, district, and years of residence.
3. Upload residence proof and school records.
4. Pay the government processing fee (₹30-₹50).
5. The certificate is issued with a digital QR code within 5-7 working days.`;
      }

      return `Namaste! Cybersave supports direct online application for all Government Certificates:
• Income Certificate (valid 1 year for scholarships & schemes)
• Caste Certificate (SC / ST / OBC / EWS)
• Domicile / Residence Certificate (Praman Patra)
• Birth Certificate & Death Certificate (Municipal registration)
• Marriage Registration Certificate
• Non-Creamy Layer (NCL) Certificate

Go to "Certificates" on the Home Screen, upload documents, and track approval in real-time!`;
    }

    // 5. Driving License & Transport (Parivahan)
    if (
      q.includes('driving') ||
      q.includes('license') ||
      q.includes('licence') ||
      q.includes('learner') ||
      q.includes('rto') ||
      q.includes('parivahan') ||
      q.includes('challan') ||
      q.includes('rc transfer') ||
      q.includes('fastag')
    ) {
      if (q.includes('challan')) {
        return `Namaste! Here is how to check and pay Traffic E-Challans:

📲 Steps in Cybersave:
1. Go to "Services Hub" -> "Transport" -> "E-Challan Payment".
2. Enter your Vehicle Registration Number (e.g. DL01AB1234) or Challan Number.
3. View pending violation details, photo evidence, and fine amount.
4. Pay instantly using Cybersave Wallet, UPI, or Debit Card.
5. Get an instant official government payment receipt to clear your records.`;
      }

      return `Namaste! Here is how to apply for a Driving License (Sarathi / Parivahan):

1️⃣ Step 1: Learner's License (LL)
• Apply online with Aadhaar authentication (no RTO visit needed in most states).
• Upload Photo, Signature, and Form 1 (Self-declaration of fitness).
• Take the online 15-question Road Safety & Signs Quiz.
• Download instant Learner's License (valid for 6 months).

2️⃣ Step 2: Permanent Driving License (DL)
• After 30 days of holding your LL, book a driving test slot at your nearest RTO.
• Bring your vehicle and pass the physical track test.
• Smart card DL is printed and delivered by speed post in 7-14 days.

Tap "Transport Services" in Cybersave to start your application!`;
    }

    // 6. Welfare Schemes (PM-Kisan, Ayushman, PMAY, PM SVANidhi, Scholarships, Ration)
    if (
      q.includes('scheme') ||
      q.includes('kisan') ||
      q.includes('ayushman') ||
      q.includes('pmay') ||
      q.includes('pm-jay') ||
      q.includes('svanidhi') ||
      q.includes('scholarship') ||
      q.includes('ration') ||
      q.includes('pension') ||
      q.includes('sukanya') ||
      q.includes('atal')
    ) {
      if (q.includes('kisan') || q.includes('pm-kisan')) {
        return `Namaste! Here is how to apply for PM-Kisan Samman Nidhi (₹6,000/year):

🌾 Benefit: ₹6,000 per year directly credited in 3 equal installments of ₹2,000 to farmer bank accounts.

📋 Eligibility & Documents:
• Landholding farmer family with cultivable land
• Aadhaar Card linked to active bank account (DBT enabled)
• Land Ownership Record (Khasra/Khatauni/ROR document)

📲 How to Apply in Cybersave:
1. Tap "Schemes" -> "PM-Kisan Registration".
2. Enter your Aadhaar number and verify with OTP.
3. Enter land details (State, District, Sub-District, Survey/Khasra Number).
4. Upload Land document copy and submit.
5. Complete Mandatory e-KYC in the app to start receiving payments.`;
      }

      if (q.includes('ayushman') || q.includes('pm-jay') || q.includes('golden card') || q.includes('health')) {
        return `Namaste! Here is how to apply for Ayushman Bharat PM-JAY (₹5 Lakh Free Treatment):

🏥 Benefit: Free cashless health insurance cover up to ₹5,00,000 per family per year across 28,000+ empanelled government and private hospitals.

📲 How to Check & Apply in Cybersave:
1. Tap "Schemes" -> "Ayushman Bharat PM-JAY".
2. Search eligibility using your Ration Card Number, Aadhaar Number, or Mobile Number.
3. If eligible, complete instant e-KYC using Aadhaar OTP or Face Authentication.
4. Download your official Ayushman Golden Card (ABHA linked) in PDF format.
5. Show this card at any network hospital for 100% free treatment.`;
      }

      if (q.includes('scholarship') || q.includes('nsp')) {
        return `Namaste! Here is how to apply on the National Scholarship Portal (NSP):

🎓 Available Scholarships: Pre-Matric, Post-Matric, Top Class, and Merit-cum-Means scholarships for SC, ST, OBC, EWS, and Minority students.

📲 How to Apply in Cybersave:
1. Go to "Schemes" -> "National Scholarships".
2. Register with your Aadhaar number and Student Details.
3. Enter school/college name, previous year marks, and course details.
4. Upload Income Certificate, Caste Certificate, Fee Receipt, and Bank Passbook.
5. Submit for Institute & State verification. Scholarship amount is credited directly via DBT.`;
      }

      return `Namaste! Top Government Welfare Schemes available on Cybersave:
• PM-Kisan Samman Nidhi (₹6,000/year for farmers)
• Ayushman Bharat PM-JAY (₹5 Lakh free health cover)
• PM Awas Yojana (PMAY housing loan interest subsidy)
• PM SVANidhi (₹10,000-₹50,000 collateral-free working capital loan for street vendors)
• Sukanya Samriddhi Yojana (High-interest savings for girl child)
• Atal Pension Yojana (Guaranteed monthly pension ₹1,000-₹5,000 after 60)
• National Scholarship Portal (NSP) for school & college students

Visit the "Schemes" section on the Home Screen to check your eligibility and apply!`;
    }

    // 7. EPFO, PF & Pension
    if (
      q.includes('epfo') ||
      q.includes('pf') ||
      q.includes('provident') ||
      q.includes('uan') ||
      q.includes('pension') ||
      q.includes('jeevan pramaan')
    ) {
      return `Namaste! Here is how to manage your EPF & Pension Services:

📋 Services Available:
• Check EPF Balance & Download Passbook
• Online PF Withdrawal (Form 19 - Full settlement, Form 10C - Pension, Form 31 - Advance)
• UAN Activation & Aadhaar/Bank KYC Linking
• Jeevan Pramaan (Digital Life Certificate for pensioners)

📲 How to Apply for PF Withdrawal in Cybersave:
1. Tap "Services Hub" -> "EPFO & Pension" -> "PF Withdrawal Claim".
2. Enter your 12-digit UAN and Password.
3. Verify that your Aadhaar, PAN, and Bank Account are marked as 'Verified' in KYC.
4. Select the claim type (Medical, Housing, Marriage, Unemployment).
5. Authenticate with Aadhaar OTP.
6. The funds will be credited to your verified bank account within 3 to 7 working days.`;
    }

    // 8. Taxes, GST, ITR, MSME & Business
    if (
      q.includes('itr') ||
      q.includes('tax') ||
      q.includes('gst') ||
      q.includes('msme') ||
      q.includes('udyam') ||
      q.includes('fssai') ||
      q.includes('business')
    ) {
      return `Namaste! Here is how to handle Taxes & Business Registrations in Cybersave:

📊 Services Supported:
• ITR e-Filing (ITR-1 Sahaj for salaried, ITR-4 Sugam for business)
• New GST Registration & Filing (turnover > ₹40L for goods / ₹20L for services)
• Udyam / MSME Registration (100% free instant certificate for business subsidies & loans)
• FSSAI Food Business License (Basic, State, and Central)

📲 How to Register Udyam / MSME:
1. Go to "Services Hub" -> "Business & Taxes" -> "Udyam Registration".
2. Enter your 12-digit Aadhaar and verify with OTP.
3. Enter PAN number and Business Details (Enterprise Name, Investment, Bank Account).
4. Submit to receive your instant Udyam Registration Certificate with QR code.`;
    }

    // 9. Utility Bills (Electricity, Water, Gas, LPG, Broadband)
    if (
      q.includes('bill') ||
      q.includes('electricity') ||
      q.includes('water') ||
      q.includes('gas') ||
      q.includes('cylinder') ||
      q.includes('lpg') ||
      q.includes('broadband') ||
      q.includes('recharge')
    ) {
      return `Namaste! Here is how to pay Utility Bills instantly with zero platform fees on Cybersave:

💡 Supported Utilities:
• Electricity Bills: All State Discoms (BESCOM, TNEB, UPPCL, BSES, MSEB, PSPCL, etc.)
• Water & Municipal Property Tax: Instant municipal receipts
• LPG Cylinder Booking: Indane, Bharat Gas, HP Gas (subsidy direct to bank)
• Piped Gas (PNG), Broadband, Landline, and DTH

📲 Steps to Pay:
1. Tap "Pay Bills" on the Home Screen.
2. Select bill category (e.g. Electricity) and your service provider.
3. Enter your Consumer / Account Number.
4. View bill details (due date, bill amount, consumer name).
5. Pay using Cybersave Wallet, UPI, Debit Card, or Net Banking.
6. Download the official BBPS receipt instantly.`;
    }

    // 10. Cybersave Wallet & Payments
    if (
      q.includes('wallet') ||
      q.includes('add money') ||
      q.includes('balance') ||
      q.includes('payment') ||
      q.includes('refund')
    ) {
      return `Namaste! Here is everything about the Cybersave Digital Wallet:

💳 Features:
• 1-Click instant payments for all government fees and utility bills.
• Zero convenience fees and zero gateway charges.
• Instant automated refunds if any application fails or is cancelled.

📲 How to Add Money:
1. Tap the "Wallet" tab at the bottom navigation bar.
2. Tap the blue "Add Money" button.
3. Select or enter amount (e.g. ₹500, ₹1,000, ₹2,000, ₹5,000).
4. Choose payment method (UPI, Google Pay, PhonePe, Paytm, Debit Card, Net Banking).
5. Complete payment. Your wallet balance updates instantly in real-time.`;
    }

    // 11. Tracking Applications & Status
    if (
      q.includes('status') ||
      q.includes('track') ||
      q.includes('application') ||
      q.includes('applied') ||
      q.includes('certificate download')
    ) {
      return `Namaste! Here is how to track your submitted applications on Cybersave:

📲 Steps to Track:
1. Tap the "Applications" tab in the bottom navigation bar.
2. You will see all your active and past applications with real-time status:
   • 🟡 In Review: Verification in progress by local VLE / Operator.
   • 🔵 Processing: Submitted to Government Department / Ministry.
   • 🟢 Approved: Application approved! Tap "View Certificate" to download your official digitally signed PDF.
   • 🔴 Rejected: Rejection reason will be clearly displayed with option to re-apply.
3. Instant push notifications and SMS are sent whenever your status changes.`;
    }

    // 12. Passport & Voter ID
    if (
      q.includes('passport') ||
      q.includes('voter') ||
      q.includes('election') ||
      q.includes('epic')
    ) {
      if (q.includes('passport')) {
        return `Namaste! Here is how to apply for an Indian Passport (Passport Seva):

📋 Required Documents:
• Proof of Identity & Address: Aadhaar Card / Voter ID / Utility Bill
• Proof of Date of Birth: Birth Certificate / 10th School Leaving Certificate
• Annexures (for minor or urgent Tatkaal mode)

📲 How to Apply in Cybersave:
1. Tap "Services Hub" -> "Passport Seva".
2. Fill Form for Fresh Passport or Renewal (Normal ₹1,500 / Tatkaal ₹3,500).
3. Book appointment slot at your nearest Passport Seva Kendra (PSK / POPSK).
4. Visit PSK for biometric photo & document verification.
5. After police verification, your passport is delivered by Speed Post.`;
      }

      return `Namaste! Here is how to apply for or update your Voter ID (Election Commission of India):

🗳️ Services Available:
• Form 6: Apply for New Voter Registration (age 18+)
• Form 8: Shift of residence or correction in existing Voter ID
• Download e-EPIC: Digital color voter card PDF

📲 Steps in Cybersave:
1. Tap "Services Hub" -> "Voter Services (ECI)".
2. Choose Form 6 (New) or Form 8 (Correction).
3. Enter personal details and upload Aadhaar + Address proof.
4. Booth Level Officer (BLO) will conduct field verification.
5. Your digital EPIC will be ready to download in 7-10 days, and physical voter card is delivered to your home.`;
    }

    // 13. Dynamic Comprehensive Fallback for any other custom service / query
    return `Namaste! I am CyberBot, your intelligent assistant for all National Government Services on Cybersave.

Regarding your query about "${prompt}":

📌 How Cybersave Helps You Apply:
1. All official government services, welfare schemes, certificates, licenses, and utility bills can be applied directly through Cybersave.
2. Mandatory Documents typically required:
   • Identity Proof (Aadhaar Card / PAN Card / Voter ID)
   • Address Proof (Aadhaar / Utility Bill / Bank Passbook)
   • Supporting service-specific proof (Income proof, caste lineage, land record, or bill invoice)
3. How to proceed in the app:
   • Navigate to the "Services" or "Schemes" section on the Home Screen.
   • Select your required service and fill in the applicant details.
   • Upload scanned photos or PDFs of your documents.
   • Pay the applicable government fee securely using Cybersave Wallet or UPI.
   • Track your application progress in real-time under the "Applications" tab.

Would you like specific guidance on required documents, eligibility, or step-by-step application for a particular service?`;
  }
}
