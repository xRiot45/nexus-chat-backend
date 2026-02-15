import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { MessageEntity } from '../entities/message.entity';

export class MessageResponseDto {
    @ApiProperty()
    @Expose()
    id: string;

    @ApiProperty()
    @Expose()
    content: string;

    @ApiProperty()
    @Expose()
    senderId: string;

    @ApiProperty({ type: UserResponseDto })
    @Type(() => UserResponseDto)
    @Expose()
    sender: UserResponseDto;

    @ApiProperty({ nullable: true })
    @Expose()
    conversationId: string | null;

    @ApiProperty({ nullable: true })
    @Expose()
    groupId: string | null; // Pastikan ini terekspos

    @ApiProperty()
    @Expose()
    isRead: boolean;

    @ApiProperty({ nullable: true })
    @Expose()
    readAt: Date | null;

    @ApiProperty()
    @Expose()
    createdAt: Date;

    @ApiProperty()
    @Expose()
    updatedAt: Date;

    constructor(message?: Partial<MessageEntity>) {
        if (!message) return;

        this.id = message.id ?? '';
        this.content = message.content ?? '';
        this.senderId = message.senderId ?? '';
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
