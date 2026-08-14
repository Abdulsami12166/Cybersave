import {
  Injectable,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private configService: ConfigService) {}

  private get baseUrl(): string {
    return (
      this.configService.get<string>('SANDBOX_BASE_URL') ||
      'https://api.sandbox.co.in'
    );
  }

  private get apiKey(): string {
    return this.configService.get<string>('SANDBOX_API_KEY') || '';
  }

  private get apiSecret(): string {
    return this.configService.get<string>('SANDBOX_API_SECRET') || '';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    if (!this.apiKey || !this.apiSecret) {
      this.logger.error(
        'Sandbox credentials missing from environment variables',
      );
      throw new InternalServerErrorException(
        'Verification service is temporarily unavailable',
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/authenticate`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'x-api-secret': this.apiSecret,
          'x-api-version': '1.0.0',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Sandbox Auth Failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      this.accessToken = data?.data?.access_token;

      // Sandbox says token is valid for 24 hours. We'll set expiration to 23 hours to be safe.
      this.tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;

      this.logger.log('Successfully acquired new Sandbox access token');

      if (!this.accessToken) {
        throw new Error('Access token not found in response');
      }

      return this.accessToken;
    } catch (error: any) {
      this.logger.error(
        `Failed to authenticate with Sandbox: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Verification service is temporarily unavailable',
      );
    }
  }

  async sendAadhaarOtp(aadhaarNumber: string, consent: string = 'Y') {
    // ponytail: Do basic validation, keep it simple.
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      throw new BadRequestException('Invalid Aadhaar number pattern');
    }

    const token = await this.getAccessToken();

    try {
      const response = await fetch(`${this.baseUrl}/kyc/aadhaar/okyc/otp`, {
        method: 'POST',
        headers: {
          Authorization: token, // No Bearer
          'x-api-key': this.apiKey,
          'x-api-version': '1.0.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.request',
          aadhaar_number: aadhaarNumber,
          consent: consent,
          reason: 'KYC verification',
        }),
      });

      const data = await response.json();

      if (!response.ok || data.code !== 200) {
        this.logger.warn(`Sandbox sendOtp error: ${JSON.stringify(data)}`);
        // Map common errors
        if (data.code === 422 || data.code === 400) {
          throw new BadRequestException(data.message || 'Invalid request');
        }
        throw new Error(data.message || 'Sandbox API Error');
      }

      return {
        success: true,
        message: 'OTP sent successfully',
        data: {
          referenceId: data.data.reference_id,
        },
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`sendAadhaarOtp failed: ${error.message}`);
      throw new InternalServerErrorException(
        'Unable to process OTP request. Please try again.',
      );
    }
  }

  async verifyAadhaarOtp(referenceId: string, otp: string) {
    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestException('Invalid OTP format');
    }
    if (!referenceId) {
      throw new BadRequestException('Missing reference ID');
    }

    const token = await this.getAccessToken();

    try {
      const response = await fetch(
        `${this.baseUrl}/kyc/aadhaar/okyc/otp/verify`,
        {
          method: 'POST',
          headers: {
            Authorization: token,
            'x-api-key': this.apiKey,
            'x-api-version': '1.0.0',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.request',
            reference_id: String(referenceId),
            otp: String(otp),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || data.code !== 200) {
        this.logger.warn(`Sandbox verifyOtp error: ${JSON.stringify(data)}`);
        if (data.code === 422 || data.code === 400) {
          throw new BadRequestException(data.message || 'Invalid OTP');
        }
        throw new Error(data.message || 'Sandbox API Error');
      }

      // Minimal safe extraction
      const kycData = data.data || {};

      return {
        success: true,
        message: 'Aadhaar verified successfully',
        data: {
          verified: true,
          kyc: {
            name: kycData.name || null,
            dateOfBirth: kycData.date_of_birth || null,
            gender: kycData.gender || null,
            maskedAadhaar: `XXXX XXXX ${kycData.aadhaar_number ? kycData.aadhaar_number.slice(-4) : 'XXXX'}`,
            address: [
              kycData.split_address?.house,
              kycData.split_address?.street,
              kycData.split_address?.dist,
              kycData.split_address?.state,
              kycData.split_address?.pincode,
            ]
              .filter(Boolean)
              .join(', '),
          },
        },
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`verifyAadhaarOtp failed: ${error.message}`);
      throw new InternalServerErrorException(
        'Unable to verify Aadhaar. Please try again.',
      );
    }
  }
}
