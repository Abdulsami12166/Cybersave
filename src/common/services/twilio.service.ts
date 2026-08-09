import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger('TwilioService');
  private client: Twilio | null = null;
  private readonly from: string;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const apiSecret = process.env.TWILIO_API_KEY_SECRET;
    const realAccountSid = process.env.TWILIO_REAL_ACCOUNT_SID;
    this.from = process.env.TWILIO_PHONE_NUMBER || '';

    if (!sid || !token) {
      this.logger.warn('Twilio credentials not set — SMS disabled.');
      return;
    }

    try {
      if (sid.startsWith('AC')) {
        // Standard: Account SID + Auth Token
        this.client = new Twilio(sid, token);
      } else if (sid.startsWith('SK') && apiSecret && realAccountSid) {
        // API Key SID + API Key Secret + Account SID
        this.client = new Twilio(sid, apiSecret, { accountSid: realAccountSid });
      } else if (sid.startsWith('SK') && realAccountSid) {
        // API Key SID + Auth Token + Account SID
        this.client = new Twilio(sid, token, { accountSid: realAccountSid });
      } else {
        this.logger.warn(`Twilio: unrecognised SID format (${sid?.slice(0, 4)}). Set TWILIO_REAL_ACCOUNT_SID if using API Key.`);
        return;
      }
      this.logger.log(`Twilio initialized. From: ${this.from}`);
    } catch (e) {
      this.logger.error(`Twilio init failed: ${e.message}`);
    }
  }

  async sendSms(to: string, body: string): Promise<boolean> {
    if (!this.client || !this.from) {
      this.logger.warn(`[SMS disabled] OTP for ${to}: "${body}"`);
      return false;
    }
    try {
      const msg = await this.client.messages.create({ body, to, from: this.from });
      this.logger.log(`SMS sent to ${to} | SID: ${msg.sid}`);
      return true;
    } catch (e) {
      this.logger.error(`SMS failed to ${to}: ${e.message}`);
      return false; // ponytail: don't crash the OTP flow if SMS fails
    }
  }
}
