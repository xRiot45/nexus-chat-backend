import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserShortResponseDto } from 'src/shared/dto/user-short-response.dto';

export class MemberGroupResponseDto {
    @ApiProperty({ example: 'member' })
    @Expose()
    role: string;

    @ApiProperty({ example: '2026-01-16T10:00:00.000Z' })
    @Expose()
    joinedAt: Date;

    @ApiProperty({ type: UserShortResponseDto })
    @Expose()
    @Type(() => UserShortResponseDto)
    user: UserShortResponseDto;
}
