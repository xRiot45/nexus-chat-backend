import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

class UserShortResponseDto {
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

export class StoryResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    @Expose()
    id: string;

    @ApiProperty({ example: '/uploads/stories/image.jpg', nullable: true })
    @Expose()
    imageUrl: string | null;

    @ApiProperty({ example: '/uploads/stories/video.mp4', nullable: true })
    @Expose()
    videoUrl: string | null;

    @ApiProperty({ example: 'Momen indah hari ini!', nullable: true })
    @Expose()
    caption: string | null;

    @ApiProperty()
    @Expose()
    @Type(() => Date)
    expiresAt: Date;

    @ApiProperty()
    @Expose()
    @Type(() => Date)
    createdAt: Date;

    @ApiProperty()
    @Expose()
    @Type(() => Date)
    updatedAt: Date;

    @ApiProperty({ type: () => UserShortResponseDto })
    @Expose()
    @Type(() => UserShortResponseDto)
    user: UserShortResponseDto;
}
