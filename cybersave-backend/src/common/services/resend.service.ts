import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
  private readonly logger = new Logger('ResendService');
  private resend: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.resend) {
      this.logger.warn('Resend API key is missing. Mocking email send.');
      return { id: 'mock-email-id-123' };
    }

    try {
      const response = await this.resend.emails.send({
        from: 'CyberSave <onboarding@resend.dev>',
        to,
        subject,
        html,
      });
      return response;
    } catch (error) {
      this.logger.error('Failed to send email via Resend client', error);
      throw error;
    }
  }
}
