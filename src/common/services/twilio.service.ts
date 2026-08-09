import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger('TwilioService');
  private client: Twilio | null = null;
  private readonly from: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;   // AC...
    const authToken  = process.env.TWILIO_AUTH_TOKEN;    // 32-char hex from Twilio console
    const apiKeySid  = process.env.TWILIO_API_KEY_SID;   // SK... (optional)
    const apiSecret  = process.env.TWILIO_API_KEY_SECRET; // API Key secret (optional)
    this.from = process.env.TWILIO_PHONE_NUMBER || '';

    if (!this.from) {
      this.logger.warn('TWILIO_PHONE_NUMBER not set — SMS disabled.');
      return;
    }

    try {
      if (accountSid?.startsWith('AC') && authToken) {
        // Standard: Account SID + Auth Token (recommended)
        this.client = new Twilio(accountSid, authToken);
        this.logger.log(`Twilio ready (Account SID auth). From: ${this.from}`);
      } else if (apiKeySid?.startsWith('SK') && apiSecret && accountSid?.startsWith('AC')) {
        // API Key: SK SID + API Secret + Account SID
        this.client = new Twilio(apiKeySid, apiSecret, { accountSid });
        this.logger.log(`Twilio ready (API Key auth). From: ${this.from}`);
      } else {
        this.logger.warn(
          'Twilio: set TWILIO_ACCOUNT_SID (AC...) + TWILIO_AUTH_TOKEN, or TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET + TWILIO_ACCOUNT_SID (AC...)',
        );
      }
    } catch (e) {
      this.logger.error(`Twilio init error: ${e.message}`);
    }
  }

  async sendSms(to: string, body: string): Promise<boolean> {
    if (!this.client) {
      this.logger.warn(`[SMS disabled] ${to}`);
      return false;
    }
    try {
      const msg = await this.client.messages.create({ body, to, from: this.from });
      this.logger.log(`SMS sent to ${to} | SID: ${msg.sid}`);
      return true;
    } catch (e) {
      this.logger.error(`SMS send failed to ${to}: ${e.message}`);
      return false;
    }
  }
}
