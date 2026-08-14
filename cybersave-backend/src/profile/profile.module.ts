import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { CloudinaryService } from '../common/services/cloudinary.service';

@Module({
  providers: [ProfileService, CloudinaryService],
  controllers: [ProfileController],
  exports: [ProfileService, CloudinaryService],
})
export class ProfileModule {}
