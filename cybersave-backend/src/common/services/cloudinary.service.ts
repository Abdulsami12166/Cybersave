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
      this.logger.warn(
        'Cloudinary credentials missing or default placeholder. Running in fallback upload mode.',
      );
    }
  }

  async uploadImage(fileBuffer: Buffer, folder = 'cybersave'): Promise<string> {
    if (!this.isConfigured) {
      this.logger.log(
        'Cloudinary credentials missing, returning default avatar URL.',
      );
      return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
    }

    return new Promise((resolve) => {
      cloudinary.uploader
        .upload_stream({ folder }, (error, result) => {
          if (error) {
            this.logger.error('Cloudinary image upload failed', error);
            return resolve(
              'https://res.cloudinary.com/sami/image/upload/v1/cybersave/avatars/default_avatar.jpg',
            );
          }
          resolve(
            result?.secure_url ||
              'https://res.cloudinary.com/sami/image/upload/v1/cybersave/avatars/default_avatar.jpg',
          );
        })
        .end(fileBuffer);
    });
  }

  async uploadBase64Image(
    base64Str: string,
    folder = 'cybersave/avatars',
  ): Promise<string> {
    if (!this.isConfigured) {
      this.logger.warn('Cloudinary not configured for base64 upload.');
      return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
    }

    try {
      const dataUri = base64Str.startsWith('data:')
        ? base64Str
        : `data:image/jpeg;base64,${base64Str}`;
      const result = await cloudinary.uploader.upload(dataUri, { folder });
      this.logger.log(
        `Uploaded base64 avatar image to Cloudinary: ${result.secure_url}`,
      );
      return result.secure_url;
    } catch (error: any) {
      this.logger.error('Cloudinary base64 upload failed', error);
      return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
    }
  }
}
