import {
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ApiDocGenericResponse } from 'src/common/decorators/api-doc.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { createStorageConfig, fileFilter } from 'src/shared/utils/file-upload.util';
import { BaseResponseDto } from './../../shared/dto/base-response.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { InviteMemberDto, InviteMemberResponseDto } from './dto/invite-member.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) {}

    @ApiDocGenericResponse({
        summary: 'Create a new group',
        description: 'Create a new group and add the current user as the owner',
        auth: true,
        isMultipart: true,
        body: CreateGroupDto,
        response: GroupResponseDto,
        status: HttpStatus.CREATED,
    })
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('icon', {
            storage: createStorageConfig('icons'),
            fileFilter: fileFilter,
            limits: { fileSize: 2 * 1024 * 1024 },
        }),
    )
    async create(
        @CurrentUser() user: JwtPayload,
        @Body() createGroupDto: CreateGroupDto,
        @UploadedFile() icon: Express.Multer.File,
    ): Promise<BaseResponseDto<GroupResponseDto>> {
        const result = await this.groupsService.create(user?.sub, createGroupDto, icon);
        return {
            success: true,
            statusCode: HttpStatus.CREATED,
            message: 'Group created successfully',
            timestamp: new Date(),
            data: result,
        };
    }

    @ApiDocGenericResponse({
        summary: 'Invite members to a group',
        description: 'Invite members to join a specified group',
        auth: true,
        body: InviteMemberDto,
        response: InviteMemberResponseDto,
        status: HttpStatus.CREATED,
    })
    @Post('invite')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async inviteMembers(@Body() inviteMemberDto: InviteMemberDto): Promise<BaseResponseDto<InviteMemberResponseDto>> {
        const result = await this.groupsService.inviteMembers(inviteMemberDto);
        return {
            success: true,
            statusCode: HttpStatus.CREATED,
            message: 'Members invited successfully',
            timestamp: new Date(),
            data: result,
        };
    }

    @ApiDocGenericResponse({
        summary: 'Update group details',
        description: 'Update the details of an existing group',
        auth: true,
        isMultipart: true,
        body: UpdateGroupDto,
        response: GroupResponseDto,
        status: HttpStatus.OK,
    })
    @Patch(':groupId')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('icon', {
            storage: createStorageConfig('icons'),
            fileFilter: fileFilter,
            limits: { fileSize: 2 * 1024 * 1024 },
        }),
    )
    async update(
        @Param('groupId') groupId: string,
        @CurrentUser() user: JwtPayload,
        @Body() updateGroupDto: UpdateGroupDto,
        @UploadedFile() icon: Express.Multer.File,
    ): Promise<BaseResponseDto<GroupResponseDto>> {
        const result = await this.groupsService.update(groupId, user?.sub, updateGroupDto, icon);
        return {
            success: true,
            statusCode: HttpStatus.OK,
            message: 'Group updated successfully',
            timestamp: new Date(),
            data: result,
        };
    }

    @ApiDocGenericResponse({
        summary: 'Kick member',
        description: 'Kick a member from a group (Requires Owner or Admin role)',
        auth: true,
        response: BaseResponseDto,
        status: HttpStatus.OK,
    })
    @Delete(':groupId/members/:memberId')
    @UseGuards(JwtAuthGuard)
    async kickMember(
        @Param('groupId') groupId: string,
        @Param('memberId') memberId: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<BaseResponseDto> {
        await this.groupsService.kickMember(memberId, user.sub, groupId);
        return {
            success: true,
            statusCode: HttpStatus.OK,
            message: 'Member has been successfully removed from the group',
            timestamp: new Date(),
        };
    }
}
