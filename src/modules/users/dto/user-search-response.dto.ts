import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { UserEntity } from '../entities/user.entity';

@Exclude()
export class UserSearchResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655....' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'johndoe' })
    @Expose()
    username: string;

    @ApiProperty({ example: 'John Doe' })
    @Expose()
    fullName: string;

    @ApiProperty({ example: 'https://cdn.example.com/avatars/user1.jpg', nullable: true })
    @Expose()
    avatarUrl: string | null;

    @ApiProperty({ example: 'Software Engineer based in Jakarta.', nullable: true })
    @Expose()
    bio: string | null;

    @ApiProperty({ example: true, description: 'Is the user verified?' })
    @Expose()
    isVerified: boolean;

    @ApiProperty({ enum: UserStatus, example: UserStatus.ONLINE })
    @Expose()
    status: UserStatus;

    @ApiProperty({ example: '2026-01-16T10:00:00.000Z' })
    @Expose()
    lastSeenAt: Date;

    @ApiProperty({
        example: false,
        description: 'True if the current user already has this person in contacts',
    })
    @Expose()
    isContact: boolean;

    static fromEntity(user: UserEntity): UserSearchResponseDto {
        const dto = new UserSearchResponseDto();

        dto.id = user.id;
        dto.username = user.username;
        dto.fullName = user.fullName;
        dto.avatarUrl = user.avatarUrl;
        dto.bio = user.bio;
        dto.isVerified = user.isVerified;
        dto.status = user.status;
        dto.lastSeenAt = user.lastSeenAt;
        dto.isContact = user.addedBy && user.addedBy.length > 0;

        return dto;
    }
}
