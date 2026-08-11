import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'User mobile phone number',
  })
  @IsNotEmpty()
  @IsString()
  phone: string;
}
