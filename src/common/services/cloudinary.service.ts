import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger('CloudinaryService');
  private isConfigured = false;
  private readonly cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dzo4caeef';
  private readonly uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'cybersave_docs';

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
      this.logger.log(
        `Cloudinary using preset '${this.uploadPreset}' on cloud '${this.cloudName}'.`,
      );
    }
  }

  async uploadImage(fileBuffer: Buffer, folder = 'cybersave/documents'): Promise<string> {
    if (this.isConfigured) {
      return new Promise((resolve) => {
        cloudinary.uploader
          .upload_stream({ folder }, (error, result) => {
            if (error) {
              this.logger.error('Cloudinary image upload failed', error);
              return resolve(this.uploadDirectBuffer(fileBuffer, folder));
            }
            resolve(result?.secure_url || '');
          })
          .end(fileBuffer);
      });
    }

    return this.uploadDirectBuffer(fileBuffer, folder);
  }

  private async uploadDirectBuffer(fileBuffer: Buffer, folder: string): Promise<string> {
    try {
      const base64Data = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
      return await this.uploadBase64Image(base64Data, folder);
    } catch (e: any) {
      this.logger.error(`Direct buffer upload error: ${e.message}`);
      return `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
    }
  }

  async uploadBase64Image(
    base64Str: string,
    folder = 'cybersave/documents',
  ): Promise<string> {
    const dataUri = base64Str.startsWith('data:')
      ? base64Str
      : `data:image/jpeg;base64,${base64Str}`;

    if (this.isConfigured) {
      try {
        const result = await cloudinary.uploader.upload(dataUri, { folder });
        this.logger.log(
          `Uploaded base64 image to Cloudinary: ${result.secure_url}`,
        );
        return result.secure_url;
      } catch (error: any) {
        this.logger.warn(`SDK upload failed, attempting direct preset upload: ${error.message}`);
      }
    }

    // Direct Cloudinary REST API upload using unsigned preset
    try {
      const form = new FormData();
      form.append('file', dataUri);
      form.append('upload_preset', this.uploadPreset);
      form.append('folder', folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`, {
        method: 'POST',
        body: form,
      });

      const data: any = await res.json();
      if (data?.secure_url) {
        this.logger.log(`Directly uploaded to Cloudinary: ${data.secure_url}`);
        return data.secure_url;
      }
    } catch (restErr: any) {
      this.logger.error(`Direct Cloudinary preset upload failed: ${restErr.message}`);
    }

    // Fallback: return dataUri directly so the real user image is never lost
    return dataUri;
  }
}

