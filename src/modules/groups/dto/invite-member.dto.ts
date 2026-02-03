import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class InviteMemberDto {
    @ApiProperty({ description: 'The ID of the group to which members are being invited' })
    @IsNotEmpty()
    @IsString()
    groupId: string;

    @ApiProperty({ description: 'Array of member IDs to be invited to the group', type: [String] })
    @IsNotEmpty({ each: true })
    @IsString({ each: true })
    memberIds: string[];
}

export class InviteMemberResponseDto {
    @ApiProperty({ description: 'Number of members successfully invited' })
    @Expose()
    count: number;

    @ApiProperty({ description: 'Number of members that were already members of the group' })
    @Expose()
    skippedCount: number;
}
