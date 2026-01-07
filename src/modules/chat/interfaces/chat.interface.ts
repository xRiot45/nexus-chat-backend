import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { MessageResponseDto } from '../dto/message-response.dto';

export interface ServerToClientEvents {
    message: (data: MessageResponseDto) => void;
    exception: (data: { status: string; message: string }) => void;
    userStatusChanged: (data: { userId: string; status: string; lastSeenAt: Date }) => void;
    messageRead: (data: { conversationId: string; readBy: string; lastReadMessageId: string }) => void;
}

export interface ClientToServerEvents {
    sendMessage: (data: MessageResponseDto) => void;
    markAsRead: (data: { conversationId: string }) => void;
}

export interface SocketData {
    user: JwtPayload;
}
