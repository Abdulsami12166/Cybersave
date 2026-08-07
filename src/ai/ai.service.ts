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
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.logger.log('Gemini AI Service initialized successfully for Cyberbot.');
      } catch (error) {
        this.logger.error('Failed to initialize Gemini AI Client', error);
      }
    } else {
      this.logger.warn('GEMINI_API_KEY missing from env. Operating in mock mode.');
    }
  }

  private async generateText(prompt: string, systemInstruction?: string): Promise<string> {
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
      this.logger.error('Gemini generation failed, falling back to mock response', error);
      return this.getMockResponse(prompt);
    }
  }

  async chat(userId: string, message: string): Promise<string> {
    let userName = 'User';
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      if (user?.profile?.fullName) userName = user.profile.fullName;
    }

    const systemInstruction = `You are CyberBot, the official AI assistant for Cybersave (National Government Services Digital Portal). Assist ${userName} with questions regarding Aadhaar updates, PAN card application/linking, Birth/Death/Income/Caste/Domicile certificates, utility bill payments, and government schemes (PM-Kisan, Ayushman Bharat, PMAY). Keep answers clear, accurate, helpful, and concise.`;

    return this.generateText(message, systemInstruction);
  }

  private getMockResponse(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('aadhaar') || lower.includes('address')) {
      return 'To update your address on Aadhaar online: 1. Go to Aadhaar Services in Cybersave. 2. Select "Update Address". 3. Upload a valid proof of address (utility bill, rent deed, or bank passbook). Updates are usually processed within 5-7 working days.';
    }
    if (lower.includes('pan') || lower.includes('link')) {
      return 'Linking PAN card with Aadhaar is mandatory under Income Tax rules. You can select "Link with Aadhaar" under PAN Services in the Cybersave app, enter your 10-digit PAN and 12-digit Aadhaar number, and verify via OTP.';
    }
    if (lower.includes('certificate') || lower.includes('birth') || lower.includes('income')) {
      return 'You can apply for state certificates directly under Certificates in Cybersave. Required documents include hospital discharge slips, parent Aadhaar cards, or income proofs. Standard processing fee is ₹30-₹50.';
    }
    return 'Namaste! I am CyberBot, your digital assistant for National Government Services. How can I assist you with Aadhaar, PAN card, certificates, or schemes today?';
  }
}
