import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'aarav@example.com',
    description: 'User email or phone number',
  })
  @IsNotEmpty()
  @IsString()
  emailOrPhone: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'User password' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
