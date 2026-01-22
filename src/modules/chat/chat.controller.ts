import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiDocGenericResponse } from 'src/common/decorators/api-doc.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { ChatService } from './chat.service';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Get('messages')
    @ApiDocGenericResponse({
        summary: 'Get messages',
        description: 'List of messages',
        response: MessageResponseDto,
        auth: true,
    })
    @UseGuards(JwtAuthGuard)
    async getMessages(
        @CurrentUser() user: JwtPayload,
        @Query('recipientId') recipientId: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
        @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
    ): Promise<MessageResponseDto[]> {
        return this.chatService.getMessages(user?.sub, recipientId, limit, offset);
    }

    @Get('recent-messages')
    @ApiDocGenericResponse({
        summary: 'Get recent conversations with last message',
        description:
            'Retrieves a list of conversations for the current user, including the most recent message snippet for each.',
        response: ConversationResponseDto,
        auth: true,
    })
    @UseGuards(JwtAuthGuard)
    async getUserRecentConversationsWithLastMessage(
        @CurrentUser() user: JwtPayload,
    ): Promise<ConversationResponseDto[]> {
        return this.chatService.getUserRecentConversationsWithLastMessage(user.sub);
    }
}
