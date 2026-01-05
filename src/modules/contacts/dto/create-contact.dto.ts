import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateContactDto {
    @ApiProperty({
        description: 'User ID to be added as a contact',
        example: '<user-id>',
    })
    @IsUUID()
    @IsNotEmpty()
    contactUserId: string;

    @ApiProperty({
        description: 'Pseudonym for the contact',
        example: 'Budi (alias)',
        maxLength: 100,
    })
    @IsString()
    @IsOptional()
    @Length(1, 100)
    alias: string;
}
