import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserResponseDto } from 'src/modules/users/dto/user-response.dto';
import { MessageResponseDto } from './message-response.dto';

export class ConversationResponseDto {
    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'The unique identifier of the conversation (UUID)',
    })
    id: string;

    @ApiProperty({
        description: 'The unique identifier of the creator (UUID)',
        type: UserResponseDto,
    })
    @Type(() => UserResponseDto)
    creator: UserResponseDto;

    @ApiProperty({
        description: 'The unique identifier of the recipient (UUID)',
        type: UserResponseDto,
    })
    @Type(() => UserResponseDto)
    recipient: UserResponseDto;

    @ApiProperty({
        description: 'The list of messages in the conversation',
        type: MessageResponseDto,
        isArray: true,
    })
    @Type(() => MessageResponseDto)
    messages: MessageResponseDto[];

    @ApiProperty({
        example: '2023-08-31T10:00:00.000Z',
        description: 'The creation date and time of the conversation',
    })
    createdAt: Date;

    @ApiProperty({
        example: '2023-08-31T10:00:00.000Z',
        description: 'The last update date and time of the conversation',
    })
    updatedAt: Date;
}
