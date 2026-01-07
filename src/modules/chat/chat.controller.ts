import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post()
    async createMessage(
        @CurrentUser() user: JwtPayload,
        @Body() createMessageDto: CreateMessageDto,
    ): Promise<MessageResponseDto> {
        return this.chatService.sendMessage(user?.sub, createMessageDto);
    }
}
