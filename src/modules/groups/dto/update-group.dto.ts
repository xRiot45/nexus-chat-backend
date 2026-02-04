import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateGroupDto {
    @ApiPropertyOptional({ description: 'Group name', minLength: 3, maxLength: 100 })
    @IsString()
    @IsOptional()
    @Length(3, 100, { message: 'Group name must be between 3 and 100 characters' })
    name?: string;

    @ApiPropertyOptional({ description: 'Group description', minLength: 3, maxLength: 255 })
    @IsString()
    @IsOptional()
    @Length(3, 255, { message: 'Group description must be between 3 and 255 characters' })
    description?: string;

    @ApiPropertyOptional({
        description: 'Icon Group file (jpg, png, webp)',
        type: 'string',
        format: 'binary',
    })
    @IsOptional()
    icon?: Express.Multer.File;
}
