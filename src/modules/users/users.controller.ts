import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ApiDocGenericResponse } from 'src/common/decorators/api-doc.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { BaseResponseDto } from 'src/shared/dto/base-response.dto';
import type { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { createStorageConfig, fileFilter } from 'src/shared/utils/file-upload.util';
import { SearchUserDto } from './dto/search-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserSearchResponseDto } from './dto/user-search-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @ApiDocGenericResponse({
        summary: 'Search users',
        description: 'Search users by username or full name',
        response: UserSearchResponseDto,
        status: HttpStatus.OK,
        auth: true,
    })
    @Get('search')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async searchUsers(
        @Query() searchUserDto: SearchUserDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<BaseResponseDto<UserSearchResponseDto[]>> {
        const users = await this.usersService.searchUsers(searchUserDto.q, user.sub);
        return {
            success: true,
            statusCode: HttpStatus.OK,
            timestamp: new Date(),
            message: 'Users fetched successfully',
            data: users,
        };
    }

    @ApiDocGenericResponse({
        summary: 'Update user profile',
        description: 'Updates username, full name, bio, and avatar. Supports multipart/form-data.',
        auth: true,
        consumes: 'multipart/form-data',
        body: UpdateProfileDto,
        response: UserResponseDto,
        status: HttpStatus.OK,
    })
    @Patch('profile')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(
        FileInterceptor('avatar', {
            storage: createStorageConfig('avatars'),
            fileFilter: fileFilter,
            limits: { fileSize: 2 * 1024 * 1024 },
        }),
    )
    async updateProfile(
        @CurrentUser() user: JwtPayload,
        @Body() updateProfileDto: UpdateProfileDto,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<UserResponseDto> {
        const userId = user.sub;
        return this.usersService.updateProfile(userId, updateProfileDto, file);
    }
}
