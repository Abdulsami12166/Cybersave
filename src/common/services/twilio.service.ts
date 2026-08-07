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
    if (sid && token) {
      this.client = new Twilio(sid, token);
    }
  }

  async sendSms(to: string, body: string) {
    if (!this.client) {
      this.logger.warn('Twilio credentials missing. Mocking SMS send.');
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
