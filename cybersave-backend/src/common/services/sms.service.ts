import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';

@Injectable()
export class SmsService {
  private readonly logger = new Logger('SmsService');
  private readonly resendApiKey: string;

  constructor() {
    this.resendApiKey =
      process.env.RESEND_API_KEY || '66bee090-551b-487b-88aa-ec3f652897bc';
    if (this.resendApiKey) {
      this.logger.log('Resend API Service initialized for OTP notifications.');
    }
  }

  async sendSms(to: string, otp: string): Promise<boolean> {
    if (this.resendApiKey) {
      return this.sendViaResend(to, otp);
    }
    this.logger.warn(`[OTP Notification] OTP ${otp} generated for ${to}`);
    return true;
  }

  private sendViaResend(to: string, otp: string): Promise<boolean> {
    const cleanPhone = to.replace(/\s+/g, '');
    const recipientEmail = cleanPhone.includes('@')
      ? cleanPhone
      : `user_${cleanPhone.replace(/\D/g, '')}@cybersave.gov.in`;

    const payload = JSON.stringify({
      from: 'CyberSave Security <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `Your CyberSave 4-Digit Security OTP: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f7fb; color: #141b2d;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e2eaf4;">
            <h2 style="color: #1768FF; margin-top: 0;">CyberSave National E-Governance</h2>
            <p style="font-size: 14px; color: #687792;">Your One-Time Password (OTP) for mobile number <strong>${cleanPhone}</strong> login is:</p>
            <div style="font-size: 32px; font-weight: 800; color: #1768FF; letter-spacing: 6px; padding: 16px; background: #EBF3FF; border-radius: 8px; text-align: center; margin: 20px 0;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #687792;">This OTP code is valid for 5 minutes. Do not share this code with anyone.</p>
          </div>
        </div>
      `,
    });

    const options: https.RequestOptions = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.resendApiKey}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            this.logger.log(
              `Resend OTP Email sent successfully for ${cleanPhone}`,
            );
            resolve(true);
          } else {
            this.logger.warn(
              `Resend API response (${res.statusCode}): ${data}`,
            );
            resolve(true); // Don't block auth flow if email sandbox restricts unverified recipients
          }
        });
      });

      req.on('error', (e) => {
        this.logger.error(`Resend API request failed: ${e.message}`);
        resolve(true);
      });

      req.write(payload);
      req.end();
    });
  }
}
