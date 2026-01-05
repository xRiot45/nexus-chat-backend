import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { UserResponseDto } from 'src/modules/users/dto/user-response.dto';

export class ContactResponseDto {
    @ApiProperty({ example: 'uuid-string-here' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Budi (alias)' })
    @Expose()
    alias: string;

    @ApiProperty()
    @Expose()
    userId: string;

    @ApiProperty()
    @Exclude()
    contactUserId: string;

    @ApiProperty({ type: () => UserResponseDto })
    @Expose()
    @Type(() => UserResponseDto)
    contactUser: UserResponseDto;

    @ApiProperty()
    @Expose()
    createdAt: Date;

    @ApiProperty()
    @Expose()
    updatedAt: Date;
}
