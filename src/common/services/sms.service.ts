import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger('SmsService');
  private twilioClient: Twilio | null = null;
  private readonly twilioFrom: string;
  private readonly fast2smsKey: string;

  constructor() {
    this.fast2smsKey = process.env.FAST2SMS_API_KEY || '';
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    this.twilioFrom  = process.env.TWILIO_PHONE_NUMBER || '';

    if (accountSid?.startsWith('AC') && authToken) {
      try {
        this.twilioClient = new Twilio(accountSid, authToken);
        this.logger.log('Twilio ready (non-India fallback).');
      } catch (e) {
        this.logger.error(`Twilio init: ${e.message}`);
      }
    }

    if (this.fast2smsKey) this.logger.log('Fast2SMS ready for Indian (+91) numbers.');
    if (!this.fast2smsKey && !this.twilioClient) this.logger.warn('No SMS provider configured.');
  }

  async sendSms(to: string, otp: string): Promise<boolean> {
    if ((to.startsWith('+91') || to.startsWith('91')) && this.fast2smsKey) {
      return this.sendViaFast2SMS(to, otp);
    }
    if (this.twilioClient) {
      return this.sendViaTwilio(to, `Your CyberSave OTP is ${otp}. Valid 5 minutes. Do not share.`);
    }
    this.logger.warn(`[SMS disabled] OTP ${otp} for ${to}`);
    return false;
  }

  private sendViaFast2SMS(to: string, otp: string): Promise<boolean> {
    const number = to.replace(/^\+91|^91/, '').replace(/\D/g, '');
    const params = new URLSearchParams({
      authorization: this.fast2smsKey,
      route: 'otp',
      variables_values: otp,
      flash: '0',
      numbers: number,
    });

    return new Promise((resolve) => {
      https.get(`https://www.fast2sms.com/dev/bulkV2?${params}`, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.return === true) {
              this.logger.log(`Fast2SMS OTP sent to ${to}`);
              resolve(true);
            } else {
              this.logger.error(`Fast2SMS error: ${data}`);
              resolve(false);
            }
          } catch {
            this.logger.error(`Fast2SMS parse error: ${data}`);
            resolve(false);
          }
        });
      }).on('error', (e) => {
        this.logger.error(`Fast2SMS request failed: ${e.message}`);
        resolve(false);
      });
    });
  }

  private async sendViaTwilio(to: string, body: string): Promise<boolean> {
    try {
      const msg = await this.twilioClient!.messages.create({ body, to, from: this.twilioFrom });
      this.logger.log(`Twilio SMS sent to ${to} | SID: ${msg.sid}`);
      return true;
    } catch (e) {
      this.logger.error(`Twilio SMS failed to ${to}: ${e.message}`);
      return false;
    }
  }
}
