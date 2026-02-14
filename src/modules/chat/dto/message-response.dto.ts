import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { MessageEntity } from '../entities/message.entity';

export class MessageResponseDto {
    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'The unique identifier of the message (UUID)',
    })
    @Expose()
    id: string;

    @ApiProperty({
        example: 'Halo, how are you?',
        description: 'The content of the message',
    })
    @Expose()
    content: string;

    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'The unique identifier of the sender (UUID)',
    })
    @Expose()
    senderId: string;

    @ApiProperty({
        type: UserResponseDto,
    })
    @Type(() => UserResponseDto)
    @Expose()
    sender: UserResponseDto;

    // --- MODIFIKASI: Conversation ID jadi Nullable ---
    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'The unique identifier of the conversation (UUID). Null if Group Chat.',
        nullable: true,
    })
    @Expose()
    conversationId: string | null;

    // --- MODIFIKASI: Tambah Group ID ---
    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'The unique identifier of the group (UUID). Null if 1-on-1 Chat.',
        nullable: true,
    })
    @Expose()
    groupId: string | null;

    @ApiProperty({
        example: false,
        description: 'True if the message has been read (Specific logic for 1-on-1)',
    })
    @Expose()
    isRead: boolean;

    @ApiProperty({
        example: '2023-08-31T10:00:00.000Z',
        description: 'The read date and time',
        nullable: true,
    })
    @Expose()
    readAt: Date | null;

    @ApiProperty({
        example: '2023-08-31T10:00:00.000Z',
        description: 'The creation date and time of the message',
    })
    @Expose()
    createdAt: Date;

    @ApiProperty({
        example: '2023-08-31T10:00:00.000Z',
        description: 'The last update date and time of the message',
    })
    @Expose()
    updatedAt: Date;

    constructor(message?: Partial<MessageEntity>) {
        if (!message) return;

        this.id = message.id ?? '';
        this.content = message.content ?? '';
        this.senderId = message.senderId ?? '';

        // Logic Kondisional: Gunakan null jika tidak ada
        this.conversationId = message.conversationId ?? null;
        this.groupId = message.groupId ?? null;

        this.isRead = message.isRead ?? false;
        this.readAt = message.readAt ?? null;
        this.createdAt = message.createdAt ?? new Date();
        this.updatedAt = message.updatedAt ?? new Date();

        if (message.sender) {
            this.sender = new UserResponseDto(message.sender);
        }
    }
}
