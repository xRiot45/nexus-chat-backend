import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { instanceToPlain } from 'class-transformer';
import { Server, Socket } from 'socket.io';
import { LoggerService } from 'src/core/logger/logger.service';
import { TokenService } from 'src/core/services/token.service';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';

interface SocketData {
    user: JwtPayload;
}

interface CustomEvents {
    event1: unknown;
    event2: unknown;
}

export type AuthSocket = Socket<CustomEvents, CustomEvents, CustomEvents, SocketData>;

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly chatService: ChatService,
        private readonly logger: LoggerService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly tokenService: TokenService,
    ) {}

    async handleConnection(client: AuthSocket): Promise<void> {
        const context = `${ChatGateway.name}.handleConnection`;
        try {
            const token = this.tokenService.extractTokenFromHandshake(client);
            if (!token) {
                this.logger.warn(`Client connected without token: ${client.id}`, context);
                throw new UnauthorizedException('Authentication token missing');
            }

            const secret = this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET');
            if (!secret) {
                this.logger.error('Server configuration error: JWT Secret missing', context);
                throw new UnauthorizedException('Authentication token missing');
            }

            const payload = this.jwtService.verify(token, {
                secret: secret,
            }) as JwtPayload;

            client.data.user = payload;

            await client.join(`user_${payload.sub}`);

            this.logger.log(`Client connected: ${client.id}`, context);
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                client.disconnect();
                return;
            }

            this.logger.error(`Failed to connect client: ${(error as Error).message}`, context);
            client.disconnect();
        }
    }

    handleDisconnect(client: AuthSocket): void {
        const context = `${ChatGateway.name}.handleDisconnect`;
        const userId = client.data.user?.sub;
        if (userId) {
            this.logger.log(`Client disconnected: ${client.id}`, context);
        }
    }

    // Event untuk Pengirim Pesan
    @SubscribeMessage('sendMessage')
    async handleSendMessage(
        @ConnectedSocket() client: AuthSocket,
        @MessageBody() createMessageDto: CreateMessageDto,
    ): Promise<MessageResponseDto> {
        const context = `${ChatGateway.name}.handleSendMessage`;
        const senderId = client.data.user?.sub;

        if (!senderId) {
            this.logger.warn(`Client connected without token: ${client.id}`, context);
            throw new UnauthorizedException('Authentication token missing');
        }

        const savedMsg = await this.chatService.sendMessage(senderId, createMessageDto);
        this.server.to(`user_${createMessageDto?.recipientId}`).emit('message', instanceToPlain(savedMsg));

        return savedMsg;
    }
}
