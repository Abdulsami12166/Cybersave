import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'User mobile phone number',
  })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: '1234', description: '4-digit or 6-digit OTP code' })
  @IsNotEmpty()
  @IsString()
  otp: string;

  @ApiPropertyOptional({
    example: 'Aarav Sharma',
    description: 'Optional user full name',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    example: 'aarav@example.com',
    description: 'Optional email address',
  })
  @IsOptional()
  @IsString()
  email?: string;
}
