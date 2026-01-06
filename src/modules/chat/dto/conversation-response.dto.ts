import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from 'src/modules/users/dto/user-response.dto';

export class ConversationResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ type: UserResponseDto })
    creator: UserResponseDto;

    @ApiProperty({ type: UserResponseDto })
    recipient: UserResponseDto;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
