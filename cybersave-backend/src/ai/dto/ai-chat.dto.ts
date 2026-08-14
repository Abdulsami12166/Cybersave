import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AiChatDto {
  @ApiProperty({
    description: 'The user message to send to CyberBot AI assistant',
    example: 'How do I update my address on Aadhaar card online?',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  message: string;

  @ApiProperty({ description: 'Optional user ID', required: false })
  @IsString()
  @IsOptional()
  userId?: string;
}
