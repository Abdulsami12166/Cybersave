import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTokenDto {
  @ApiProperty({
    description: 'Firebase ID token (or mock-token in dev mode)',
    example: 'mock-user-123',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
