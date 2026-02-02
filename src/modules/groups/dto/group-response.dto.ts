import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserShortResponseDto } from 'src/shared/dto/user-short-response.dto';

export class GroupResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'My Group' })
    @Expose()
    name: string;

    @ApiProperty({ example: 'This is description of my group' })
    @Expose()
    description: string;

    @ApiProperty({ example: '/uploads/icons/group.png' })
    @Expose()
    iconUrl: string;

    @ApiProperty({ type: () => UserShortResponseDto })
    @Expose()
    @Type(() => UserShortResponseDto)
    owner: UserShortResponseDto;

    @ApiProperty({ example: '2026-01-28T15:30:00.000Z' })
    @Expose()
    createdAt: Date;

    @ApiProperty({ example: '2026-01-28T15:30:00.000Z' })
    @Expose()
    updatedAt: Date;
}
