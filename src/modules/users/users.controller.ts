import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiDocGenericResponse } from 'src/common/decorators/api-doc.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { BaseResponseDto } from 'src/shared/dto/base-response.dto';
import type { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { SearchUserDto } from './dto/search-user.dto';
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
}
