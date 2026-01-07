import { Body, Controller, Get, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

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

    @UseGuards(JwtAuthGuard)
    @Get('messages')
    async getMessages(
        @CurrentUser() user: JwtPayload,
        @Query('recipientId') recipientId: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
        @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
    ): Promise<MessageResponseDto[]> {
        return this.chatService.getMessages(user?.sub, recipientId, limit, offset);
    }
}
