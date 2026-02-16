import { Controller, Get, HttpStatus, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
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
    @UseGuards(JwtAuthGuard)
    @ApiDocGenericResponse({
        summary: 'Get messages history',
        description:
            'Retrieve chat history. Provide either `recipientId` (for personal chat) or `groupId` (for group chat).',
        auth: true,
        response: MessageResponseDto,
        isArray: true,
        status: HttpStatus.OK,
        queries: [
            {
                name: 'recipientId',
                required: false,
                type: String,
                description: 'UUID of the recipient (Required for 1-on-1 chat)',
                example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            },
            {
                name: 'groupId',
                required: false,
                type: String,
                description: 'UUID of the group (Required for Group chat)',
                example: '5e6d300b-4505-48d1-9c04-e65bca29fe97',
            },
            {
                name: 'limit',
                required: false,
                type: Number,
                description: 'Maximum number of messages to retrieve (Default: 20)',
                example: 20,
            },
            {
                name: 'offset',
                required: false,
                type: Number,
                description: 'Number of messages to skip (Default: 0)',
                example: 0,
            },
        ],
    })
    async getMessages(
        @CurrentUser() user: JwtPayload,
        @Query('recipientId') recipientId?: string,
        @Query('groupId') groupId?: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
        @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
    ): Promise<MessageResponseDto[]> {
        return this.chatService.getMessages({
            userId: user.sub,
            recipientId,
            groupId,
            limit,
            offset,
        });
    }

    @Get('recent-messages')
    @UseGuards(JwtAuthGuard)
    @ApiDocGenericResponse({
        summary: 'Get recent conversations with last message',
        description:
            'Retrieves a list of conversations for the current user, including the most recent message snippet for each.',
        response: ConversationResponseDto,
        auth: true,
    })
    async getUserRecentConversationsWithLastMessage(
        @CurrentUser() user: JwtPayload,
    ): Promise<ConversationResponseDto[]> {
        return this.chatService.getUserRecentConversationsWithLastMessage(user.sub);
    }
}
