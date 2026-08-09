import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger('TwilioService');
  private readonly client: Twilio;
  private readonly from: string;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    this.from = process.env.TWILIO_PHONE_NUMBER || '';

    if (!sid || !token || !this.from) {
      throw new Error('Missing Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
    }

    // ponytail: Twilio supports both AC (account SID) and SK (API key SID) as first arg
    this.client = new Twilio(sid, token);
    this.logger.log(`Twilio initialized. From: ${this.from}`);
  }

  async sendSms(to: string, body: string) {
    const msg = await this.client.messages.create({ body, to, from: this.from });
    this.logger.log(`SMS sent to ${to} | SID: ${msg.sid}`);
    return msg;
  }
}
