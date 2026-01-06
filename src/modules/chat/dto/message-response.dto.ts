import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from 'src/modules/users/dto/user-response.dto';
import { MessageEntity } from '../entities/message.entity';

export class MessageResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    content: string;

    @ApiProperty()
    senderId: string;

    @ApiProperty({ type: UserResponseDto })
    sender: UserResponseDto;

    @ApiProperty()
    conversationId: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    constructor(message?: Partial<MessageEntity>) {
        if (!message) return;

        this.id = message.id ?? '';
        this.content = message.content ?? '';
        this.senderId = message.senderId ?? '';
        this.conversationId = message.conversationId ?? '';
        this.createdAt = message.createdAt ?? new Date();
        this.updatedAt = message.updatedAt ?? new Date();

        if (message.sender) {
            this.sender = new UserResponseDto(message.sender);
        }
    }
}
