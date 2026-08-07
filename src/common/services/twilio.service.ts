import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger('TwilioService');
  private client: Twilio | null = null;
  private fromNumber: string;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '+12015550123';

    if (sid && token && sid.startsWith('AC')) {
      try {
        this.client = new Twilio(sid, token);
        this.logger.log('Twilio client initialized successfully.');
      } catch (error) {
        this.logger.warn(`Twilio init failed (${error.message}). Operating in SMS fallback mode.`);
      }
    } else {
      this.logger.warn('Twilio Account SID missing or invalid (must start with AC). Operating in SMS fallback mode.');
    }
  }

  async sendSms(to: string, body: string) {
    if (!this.client) {
      this.logger.warn(`[SMS Fallback] To: ${to} | Message: "${body}"`);
      return { sid: 'mock-sms-sid-123' };
    }

    try {
      const message = await this.client.messages.create({
        body,
        to,
        from: this.fromNumber,
      });
      return message;
    } catch (error) {
      this.logger.error('Failed to send SMS via Twilio', error);
      return { sid: 'failed-sms-sid' };
    }
  }
}
