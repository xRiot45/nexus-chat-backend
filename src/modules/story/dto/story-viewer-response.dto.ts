import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserShortResponseDto } from './story-response.dto';

export class StoryViewerResponseDto {
    @ApiProperty({
        example: '2026-01-28T15:30:00.000Z',
        description: 'Waktu ketika user melihat story',
    })
    @Expose()
    seenAt: Date;

    @ApiProperty({ type: () => UserShortResponseDto })
    @Expose()
    @Type(() => UserShortResponseDto)
    user: UserShortResponseDto;
}
