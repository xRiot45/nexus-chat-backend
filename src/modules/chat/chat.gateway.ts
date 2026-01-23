import { InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { LoggerService } from 'src/core/logger/logger.service';
import { TokenService } from 'src/core/services/token.service';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { ChatUtils } from 'src/shared/utils/chat.utils';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { ClientToServerEvents, ServerToClientEvents } from './interfaces/socket.interface';

interface SocketData {
    user: JwtPayload;
}

export type AuthenticatedSocket = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;

@WebSocketGateway({
    cors: {
        origin: 'http://localhost:3001',
        credentials: true,
    },
    namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection {
    @WebSocketServer()
    private readonly server: Server<ClientToServerEvents, ServerToClientEvents>;

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        private readonly chatService: ChatService,
        private readonly logger: LoggerService,
        private readonly tokenService: TokenService,
    ) {}

    /**
     * Resets the status of all users to offline on startup.
     * @return {Promise<void>} A promise that resolves when the update operation is complete.
     */
    async onModuleInit(): Promise<void> {
        await this.userRepository.update({ status: UserStatus.ONLINE }, { status: UserStatus.OFFLINE });
        this.logger.log('Reset all users to offline on startup', 'System');
    }

    /**
     * Handle a new connection from a client.
     * Authenticate the client using the JWT token in the Authorization header.
     * If authentication is successful, update the user's status to ONLINE.
     * If authentication fails, emit an exception event to the client with a status of 'error' and a message of 'Unauthorized'. Disconnect the client.
     * @param client The connected socket client.
     * @returns A promise that resolves when the connection is handled.
     */
    async handleConnection(client: AuthenticatedSocket): Promise<void> {
        const context = `${ChatGateway.name}.handleConnection`;

        try {
            const user = await this.tokenService.authenticateSocket(client);
            client.data.user = user;

            await client.join(ChatUtils.getUserRoom(user?.sub));

            await this.userRepository.update(user.sub, {
                status: UserStatus.ONLINE,
                lastSeenAt: new Date(),
            });

            this.server.emit('userStatusChanged', {
                userId: user.sub,
                status: UserStatus.ONLINE,
                lastSeenAt: new Date(),
            });

            this.logger.log(`User ${user.sub} connected`, context);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Auth failed: ${errorMessage}`, context);

            client.emit('exception', { status: 'error', message: 'Unauthorized' });
            client.disconnect(true);
        }
    }

    /**
     * Handles the disconnect event from a client and updates the user's status to OFFLINE.
     * If the client is authenticated, the user's status is updated to OFFLINE and a log message is written.
     * @param client The disconnected socket client.
     * @returns A promise that resolves when the disconnect event is handled.
     */
    async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
        const userId = client.data.user?.sub;
        if (userId) {
            await this.userRepository.update(userId, {
                status: UserStatus.OFFLINE,
                lastSeenAt: new Date(),
            });

            this.server.emit('userStatusChanged', {
                userId: userId,
                status: UserStatus.OFFLINE,
                lastSeenAt: new Date(),
            });

            this.logger.log(`User ${userId} disconnected`, ChatGateway.name);
        }
    }

    /**
     * Handles the sendMessage event and sends the message to the recipient's room.
     * @param client The connected socket.
     * @param dto The CreateMessageDto containing the message details.
     * @returns A promise of the MessageResponseDto containing the saved message.
     * @throws Error If an unexpected error occurs during message processing.
     */
    @SubscribeMessage('sendMessage')
    async handleSendMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() dto: CreateMessageDto,
    ): Promise<MessageResponseDto> {
        const context = `${ChatGateway.name}.handleSendMessage`;
        this.logger.log(`Event sendMessage received: ${JSON.stringify(dto)}`, context);

        try {
            const senderId = client.data.user.sub;
            const savedMsg = await this.chatService.sendMessage(senderId, dto);
            const response = plainToInstance(MessageResponseDto, savedMsg, {
                excludeExtraneousValues: true,
            });

            this.logger.log(`Message successfully saved. ID: ${response.id}`, context);

            const recipientRoom = ChatUtils.getUserRoom(dto.recipientId);
            this.server.to(recipientRoom).emit('message', response);

            this.logger.log(`Message sent to room: ${recipientRoom}`, context);
            return response;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            const errorStack = error instanceof Error ? error.stack : '';

            this.logger.error(`Failed to send message: ${errorMessage}`, errorStack, context);

            throw error;
        }
    }

    /**
     * Handles the getMessages event and retrieves the chat history for the given user and recipient.
     * @param client The connected socket.
     * @param data The object containing the recipientId, limit, and offset.
     * @returns A promise of the MessageResponseDto array containing the chat history.
     */
    @SubscribeMessage('getMessages')
    async handleGetMessages(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { recipientId: string; limit?: number; offset?: number },
    ): Promise<MessageResponseDto[]> {
        const context = `${ChatGateway.name}.handleGetMessages`;
        this.logger.log(`Event getMessages received: ${JSON.stringify(data)}`, context);

        const userId = client.data.user?.sub;
        return this.chatService.getMessages(userId, data.recipientId, data.limit, data.offset);
    }

    /**
     * Handles the markConversationAsRead event and marks the conversation as read by the given user.
     * If the conversation does not exist, an InternalServerErrorException is thrown.
     * If no active sockets are found in the recipient's room, a log warning is written and the message read event is skipped.
     * @param client The connected socket.
     * @param data The object containing the conversationId and recipientId.
     * @throws {InternalServerErrorException} If an unexpected error occurs during the marking of the conversation as read.
     */
    @SubscribeMessage('markConversationAsRead')
    async handleMarkConversationAsRead(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { conversationId: string; recipientId: string },
    ): Promise<void> {
        const context = `${ChatGateway.name}.handleMarkConversationAsRead`;
        this.logger.log(`Event markConversationAsRead received: ${JSON.stringify(data)}`, context);

        try {
            const userId = client.data.user?.sub;
            const lastReadMessageId = await this.chatService.markConversationAsRead(userId, data.conversationId);

            if (lastReadMessageId) {
                const targetRoom = ChatUtils.getUserRoom(data.recipientId);

                const sockets = await this.server.in(targetRoom).fetchSockets();
                this.logger.log(`Target Room: ${targetRoom} | Active Sockets: ${sockets.length}`, context);

                if (sockets.length === 0) {
                    this.logger.warn(`Message read event skipped. No active sockets in ${targetRoom}`, context);
                }

                this.server.to(targetRoom).emit('messageRead', {
                    conversationId: data.conversationId,
                    readBy: userId,
                    lastReadMessageId: lastReadMessageId,
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to mark conversation as read: ${message}`, (error as Error).stack, context);
            throw new InternalServerErrorException('Could not mark conversation as read');
        }
    }
}
