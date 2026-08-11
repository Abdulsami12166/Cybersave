import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'aarav@example.com',
    description: 'User email address',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'User password (at least 6 chars)',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Aarav Sharma', description: 'User full name' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description: 'Optional phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
