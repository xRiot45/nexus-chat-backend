import { Body, Controller, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from 'src/shared/interfaces/authenticated-request.interface';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post()
    async createMessage(
        @Req() req: AuthenticatedRequest,
        @Body() createMessageDto: CreateMessageDto,
    ): Promise<MessageResponseDto> {
        return this.chatService.sendMessage(req.user.sub, createMessageDto);
    }
}
