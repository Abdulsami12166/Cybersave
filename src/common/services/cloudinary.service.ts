import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger('CloudinaryService');
  private isConfigured = false;

  constructor() {
    const name = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;

    if (name && key && secret && !name.includes('your_')) {
      try {
        cloudinary.config({
          cloud_name: name,
          api_key: key,
          api_secret: secret,
        });
        this.isConfigured = true;
        this.logger.log('Cloudinary SDK initialized successfully.');
      } catch (error) {
        this.logger.warn(`Cloudinary config warning: ${error.message}`);
      }
    } else {
      this.logger.warn('Cloudinary credentials missing or default placeholder. Running in fallback upload mode.');
    }
  }

  async uploadImage(fileBuffer: Buffer, folder = 'cybersave'): Promise<string> {
    if (!this.isConfigured) {
      this.logger.log('Mocking Cloudinary upload fallback.');
      return 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary image upload failed', error);
            return resolve('https://res.cloudinary.com/demo/image/upload/sample.jpg');
          }
          resolve(result?.secure_url || 'https://res.cloudinary.com/demo/image/upload/sample.jpg');
        },
      ).end(fileBuffer);
    });
  }
}
