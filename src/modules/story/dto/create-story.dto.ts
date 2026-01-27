import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStoryDto {
    @ApiProperty({ example: 'Hari yang indah!', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    caption?: string;

    @ApiProperty({ type: 'string', format: 'binary', description: 'Upload Image File' })
    @IsOptional()
    image?: string;

    @ApiProperty({ type: 'string', format: 'binary', description: 'Upload Video File' })
    @IsOptional()
    video?: string;
}
