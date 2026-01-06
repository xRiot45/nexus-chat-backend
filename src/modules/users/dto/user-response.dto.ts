import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserEntity } from '../entities/user.entity';

export class UserResponseDto {
    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'The unique identifier of the user (UUID)',
    })
    @Expose()
    id: string;

    @ApiProperty({ example: 'johndoe', description: 'The unique username of the user' })
    @Expose()
    username: string;

    @ApiProperty({ example: 'John Doe', description: 'The full name of the user' })
    @Expose()
    fullName: string;

    @ApiProperty({ example: 'john@example.com', description: 'The registered email address' })
    @Expose()
    email: string;

    @ApiProperty({
        example: 'https://cdn.example.com/avatars/user1.jpg',
        description: 'URL to the user profile picture',
        nullable: true,
    })
    @Expose()
    avatarUrl: string;

    @ApiProperty({
        example: 'Software Engineer based in Jakarta.',
        description: 'User short biography',
        nullable: true,
    })
    @Expose()
    bio: string;

    @ApiProperty({
        example: '2026-01-03T13:00:00.000Z',
        description: 'Timestamp when the email was verified',
        nullable: true,
        type: String,
        format: 'date-time',
    })
    @Expose()
    emailVerifiedAt: Date | null;

    @ApiProperty({ example: true, description: 'Verification status of the account' })
    @Expose()
    isVerified: boolean;

    @ApiProperty({
        example: '2026-01-01T10:00:00.000Z',
        description: 'Account creation timestamp',
    })
    @Expose()
    createdAt: Date;

    @ApiProperty({
        example: '2026-01-01T10:00:00.000Z',
        description: 'Account last update timestamp',
    })
    @Expose()
    updatedAt: Date;

    constructor(user: Partial<UserEntity>) {
        if (!user) return;

        this.id = user.id ?? '';
        this.username = user.username ?? '';
        this.fullName = user.fullName ?? '';
        this.email = user.email ?? '';
        this.avatarUrl = user.avatarUrl ?? '';
        this.bio = user.bio ?? '';
        this.emailVerifiedAt = user.emailVerifiedAt ?? null;
        this.isVerified = user.isVerified ?? false;
        this.createdAt = user.createdAt ?? new Date();
        this.updatedAt = user.updatedAt ?? new Date();
    }
}
