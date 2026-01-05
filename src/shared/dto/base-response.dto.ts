import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class BaseResponseDto<T = void> {
    @ApiProperty({ example: true })
    @Expose()
    success: boolean;

    @ApiProperty({ example: HttpStatus.OK })
    @Expose()
    statusCode: number;

    @ApiProperty({ example: new Date() })
    @Expose()
    @Type(() => Date)
    timestamp: Date;

    @ApiProperty({ example: 'Operation successful' })
    @Expose()
    message?: string;

    @ApiProperty({ example: null })
    @Expose()
    data?: T;
}
