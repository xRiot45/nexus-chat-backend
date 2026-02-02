import { Body, Controller, HttpCode, HttpStatus, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ApiDocGenericResponse } from 'src/common/decorators/api-doc.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { BaseResponseDto } from 'src/shared/dto/base-response.dto';
import type { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { createStorageConfig, fileFilter } from 'src/shared/utils/file-upload.util';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
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
}
