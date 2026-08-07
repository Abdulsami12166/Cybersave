import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token issued by the backend',
    example: 'refresh-token-uuid-or-jwt',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
