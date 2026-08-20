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
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
        });
        this.logger.log(
          'Gemini AI Service initialized successfully for Cyberbot.',
        );
      } catch (error) {
        this.logger.error('Failed to initialize Gemini AI Client', error);
      }
    } else {
      this.logger.warn(
        'GEMINI_API_KEY missing from env. Operating with comprehensive local AI knowledge base.',
      );
    }
  }

  private async generateText(
    prompt: string,
    systemInstruction?: string,
  ): Promise<string> {
    if (!this.model) {
      return this.getMockResponse(prompt);
    }

    try {
      const fullPrompt = systemInstruction
        ? `System: ${systemInstruction}\n\nUser: ${prompt}`
        : prompt;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      this.logger.error(
        'Gemini generation failed, falling back to local response knowledge',
        error,
      );
      return this.getMockResponse(prompt);
    }
  }

  async chat(userId: string, message: string): Promise<string> {
    let userName = 'Citizen';
    if (userId && userId !== 'default-user-id') {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { profile: true },
        });
        if (user?.profile?.fullName) userName = user.profile.fullName;
        else if (user?.fullName) userName = user.fullName;
      } catch (e) {
        this.logger.warn('Failed to fetch user name for AI prompt', e);
      }
    }

    const systemInstruction = `You are CyberBot, the official and intelligent AI assistant for Cybersave (National Government & Digital Public Services Portal of India).
Your role is to assist ${userName} with questions regarding:
1. Aadhaar Services: Online address update, mobile linking, e-Aadhaar PDF download, PVC card order, Biometric lock/unlock, and paperless e-KYC.
2. PAN Card Services: Apply for fresh PAN (Form 49A), PAN-Aadhaar linking, corrections in PAN data, and duplicate reprint.
3. Government Certificates: Income certificate, Caste certificate (SC/ST/OBC), Domicile/Residence certificate, Birth and Death certificates.
4. Utility Bill Payments: Electricity, Water, LPG cylinder booking, Broadband & Landline bills with instant receipts and wallet auto-pay.
5. Welfare Schemes: PM-Kisan (₹6,000 yearly benefit), Ayushman Bharat PM-JAY (₹5 Lakh medical cover), PM Awas Yojana (PMAY housing), PM SVANidhi (street vendor credit), National Scholarship Portal.
6. Cybersave App Features: Cybersave Wallet (instant top-up & payment), Document Vault (encrypted storage), Live Application Tracker, and Support Tickets.

Always be polite, warm, concise, and step-by-step helpful (e.g. 'Namaste!'). If the user asks about updating an address or applying, explain the required documents and direct them to the appropriate screen in Cybersave.`;

    return this.generateText(message, systemInstruction);
  }

  private getMockResponse(prompt: string): string {
    const lower = prompt.toLowerCase();

    // 1. Address / Aadhaar update
    if (lower.includes('update address') || (lower.includes('address') && lower.includes('aadhaar'))) {
      return 'You can easily update your address online. Please have a valid address proof (like a utility bill or rent agreement) ready. Shall I assist you with checking your eligibility or start the application?';
    }

    if (lower.includes('aadhaar') || lower.includes('uidai') || lower.includes('okyc')) {
      return 'For Aadhaar services in Cybersave:\n• Update Address: Upload valid address proof\n• Link Mobile Number: Verify with OTP\n• Download e-Aadhaar: Get password-protected official PDF\n• Biometric Lock/Unlock: Secure your fingerprints & iris\nNavigate to "Aadhaar Services" from the Home Screen to begin.';
    }

    // 2. PAN Card / Linking
    if (lower.includes('pan') || lower.includes('link pan') || lower.includes('income tax')) {
      return 'To link your PAN card with Aadhaar:\n1. Open "PAN Services" on Cybersave.\n2. Tap "Link PAN with Aadhaar".\n3. Enter your 10-digit PAN and 12-digit Aadhaar number.\n4. Complete the OTP verification.\n\nEnsure your Name and Date of Birth match on both documents!';
    }

    // 3. Certificates (Income, Caste, Domicile, Birth, Death)
    if (lower.includes('certificate') || lower.includes('income') || lower.includes('caste') || lower.includes('domicile') || lower.includes('birth') || lower.includes('death')) {
      return 'You can apply for state-certified Government Certificates in Cybersave:\n• Income Certificate (valid for 1 year, requires salary slip/affidavit)\n• Caste Certificate (SC/ST/OBC/EWS)\n• Domicile/Residence Certificate\n• Birth & Death Certificate\nGo to "Certificates" in the app, upload the required proofs, and your certificate will be issued within 3-5 working days.';
    }

    // 4. Utility Bills & Payments
    if (lower.includes('bill') || lower.includes('electricity') || lower.includes('water') || lower.includes('gas') || lower.includes('cylinder') || lower.includes('broadband')) {
      return 'You can pay all central and state utility bills instantly via Cybersave:\n• Electricity Bill (Instant BBPS confirmation & invoice)\n• Water Bill & Property Tax\n• LPG Gas Cylinder Refill Booking\n• Broadband & Landline\nPay directly from your Cybersave Wallet or UPI with zero platform fee!';
    }

    // 5. Wallet & Add Money
    if (lower.includes('wallet') || lower.includes('add money') || lower.includes('balance') || lower.includes('refund')) {
      return 'Cybersave Wallet enables 1-click zero-fee payments for all government fees and bills.\n• Go to the "Wallet" tab at the bottom.\n• Tap "Add Money" and enter amount (e.g. ₹500, ₹1000, ₹2000).\n• Pay securely via UPI, Card, or Net Banking.\nRefunds from failed applications are credited back to your wallet instantly.';
    }

    // 6. Application Status / Tracking
    if (lower.includes('status') || lower.includes('track') || lower.includes('application') || lower.includes('applied')) {
      return 'To track your applications:\n1. Tap the "Applications" tab in the bottom navigation.\n2. View live status (In Review, Verified, Approved, or Rejected).\n3. Once approved, tap "View Certificate" to download your official digitally signed PDF document.';
    }

    // 7. Government Schemes
    if (lower.includes('scheme') || lower.includes('kisan') || lower.includes('ayushman') || lower.includes('pmay') || lower.includes('pm-jay') || lower.includes('svanidhi') || lower.includes('scholarship')) {
      return 'Cybersave supports direct application and eligibility checking for top welfare schemes:\n• PM-Kisan Samman Nidhi (₹6,000/yr direct benefit)\n• Ayushman Bharat PM-JAY (₹5 Lakh free health cover)\n• Pradhan Mantri Awas Yojana (PMAY housing subsidy)\n• PM SVANidhi (₹10,000-₹50,000 vendor working capital)\nVisit the "Schemes" section on the Home Screen to apply.';
    }

    // 8. General / Greeting
    return 'Namaste! I am CyberBot, your digital assistant for National Government Services. How can I help you today with Aadhaar, PAN card, certificates, bill payments, or welfare schemes?';
  }
}
