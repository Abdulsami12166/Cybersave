import { Module } from '@nestjs/common';
import { AadhaarController } from './aadhaar.controller';
import { AadhaarService } from './aadhaar.service';
import { SandboxModule } from '../sandbox/sandbox.module';

@Module({
  imports: [SandboxModule],
  controllers: [AadhaarController],
  providers: [AadhaarService],
  exports: [AadhaarService],
})
export class AadhaarModule {}
