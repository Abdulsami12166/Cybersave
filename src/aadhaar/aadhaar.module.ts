import { Module } from '@nestjs/common';
import { AadhaarController } from './aadhaar.controller';
import { AadhaarService } from './aadhaar.service';

@Module({
  controllers: [AadhaarController],
  providers: [AadhaarService],
  exports: [AadhaarService],
})
export class AadhaarModule {}
