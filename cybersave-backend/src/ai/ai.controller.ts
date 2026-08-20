import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai-chat.dto';

@ApiTags('CyberBot AI')
@Controller(['api/v1/ai', 'ai'])
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with CyberBot Government Assistant' })
  @ApiResponse({ status: 200, description: 'CyberBot response text' })
  async chat(@Body() dto: AiChatDto) {
    const userId = dto.userId || 'default-user-id';
    const text = await this.aiService.chat(userId, dto.message);
    return { response: text, reply: text, message: text };
  }
}
