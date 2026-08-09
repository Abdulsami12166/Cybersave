import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ description: 'Full name of the user', example: 'Rajesh Kumar', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ description: 'First name of the user', example: 'John', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ description: 'Last name of the user', example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ description: 'Email address', example: 'user@cybersave.gov.in', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Phone number of the user', example: '+919876543210', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Avatar image URL', example: 'https://cloudinary.com/avatar.jpg', required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ description: 'Residential Address', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'District / City', required: false })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiProperty({ description: 'State', required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ description: 'Pincode', required: false })
  @IsString()
  @IsOptional()
  pinCode?: string;

  @ApiProperty({ description: 'Date of Birth', required: false })
  @IsString()
  @IsOptional()
  dob?: string;

  @ApiProperty({ description: 'Gender', required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ description: 'JSON structure containing mood settings', example: { preferredColors: ['#FF5733'] }, required: false })
  @IsObject()
  @IsOptional()
  moodPreferences?: any;
}
