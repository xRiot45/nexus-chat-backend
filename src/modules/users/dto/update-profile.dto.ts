import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
    @ApiPropertyOptional({ description: 'New username', minLength: 3, maxLength: 50 })
    @IsOptional()
    @IsString()
    @Length(3, 50, { message: 'Username must be between 3 and 50 characters' })
    @Matches(/^[a-zA-Z0-9._]+$/, { message: 'Username allows only alphanumeric, dot, and underscore' })
    username?: string;

    @ApiPropertyOptional({ description: 'Full name', maxLength: 100 })
    @IsOptional()
    @IsString()
    @Length(1, 100)
    fullName?: string;

    @ApiPropertyOptional({ description: 'User biography' })
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiPropertyOptional({
        description: 'Avatar image file (jpg, png, webp)',
        type: 'string',
        format: 'binary',
    })
    @IsOptional()
    avatar?: Express.Multer.File;
}
