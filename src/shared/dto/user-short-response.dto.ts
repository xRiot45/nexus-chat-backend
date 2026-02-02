import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserShortResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'johndoe' })
    @Expose()
    username: string;

    @ApiProperty({ example: 'John Doe' })
    @Expose()
    fullName: string;

    @ApiProperty({ example: '/uploads/avatars/profile.jpg', nullable: true })
    @Expose()
    avatarUrl: string | null;
}
