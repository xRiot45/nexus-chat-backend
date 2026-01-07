import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserResponseDto } from 'src/modules/users/dto/user-response.dto';
import { MessageEntity } from '../entities/message.entity';

export class MessageResponseDto {
    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'The unique identifier of the message (UUID)',
    })
    id: string;

    @ApiProperty({
        example: 'Halo, how are you?',
        description: 'The content of the message',
    })
    content: string;

    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'The unique identifier of the sender (UUID)',
    })
    senderId: string;

    @ApiProperty({ type: UserResponseDto })
    @Type(() => UserResponseDto)
    sender: UserResponseDto;

    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'The unique identifier of the conversation (UUID)',
    })
    conversationId: string;

    @ApiProperty({
        example: '2023-08-31T10:00:00.000Z',
        description: 'The creation date and time of the message',
    })
    createdAt: Date;

    @ApiProperty({
        example: '2023-08-31T10:00:00.000Z',
        description: 'The last update date and time of the message',
    })
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
