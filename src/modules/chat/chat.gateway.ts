import { UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { instanceToPlain } from 'class-transformer';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { LoggerService } from 'src/core/logger/logger.service';
import { TokenService } from 'src/core/services/token.service';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { ClientToServerEvents, ServerToClientEvents } from './interfaces/chat.interface';

interface SocketData {
    user: JwtPayload;
}

export type AuthenticatedSocket = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;

@WebSocketGateway({
    cors: { origin: '*' },
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

    async handleConnection(client: AuthenticatedSocket): Promise<void> {
        const context = `${ChatGateway.name}.handleConnection`;

        try {
            const user = await this.authenticate(client);
            client.data.user = user;

            await client.join(this.getUserRoom(user?.sub));

            await this.userRepository.update(user.sub, {
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

    async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
        const userId = client.data.user?.sub;
        if (userId) {
            await this.userRepository.update(userId, {
                status: UserStatus.OFFLINE,
            });
            this.logger.log(`User ${userId} disconnected`, ChatGateway.name);
        }
    }

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
            const response = instanceToPlain(savedMsg) as MessageResponseDto;

            this.logger.log(`Message successfully saved. ID: ${response.id}`, context);

            const recipientRoom = this.getUserRoom(dto.recipientId);
            this.server.to(recipientRoom).emit('message', response); // kirim pesan ke room penerima

            this.logger.log(`Message sent to room: ${recipientRoom}`, context);
            return response;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            const errorStack = error instanceof Error ? error.stack : '';

            this.logger.error(`Failed to send message: ${errorMessage}`, errorStack, context);

            throw error;
        }
    }

    private async authenticate(client: AuthenticatedSocket): Promise<JwtPayload> {
        const context = `${ChatGateway.name}.authenticate`;
        const token = this.tokenService.extractToken(client);
        if (!token) {
            this.logger.warn(`Client connected without token: ${client.id}`, context);
            throw new UnauthorizedException('Authentication token missing');
        }

        return this.tokenService.verifyAccessToken(token);
    }

    private getUserRoom(userId: string): string {
        return `user_room_${userId}`;
    }
}
