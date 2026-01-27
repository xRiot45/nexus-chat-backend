import { Body, Controller, Get, HttpStatus, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ApiDocGenericResponse } from 'src/common/decorators/api-doc.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { createStorageConfig, fileFilter } from 'src/shared/utils/file-upload.util';
import { CreateStoryDto } from './dto/create-story.dto';
import { StoryResponseDto } from './dto/story-response.dto';
import { StoryService } from './story.service';

@ApiTags('Story')
@Controller('story')
export class StoryController {
    constructor(private readonly storyService: StoryService) {}

    @ApiDocGenericResponse({
        summary: 'Create a new story',
        description: 'Upload 1 image and 1 video along with a caption. Stories expire in 24 hours.',
        auth: true,
        isMultipart: true,
        body: CreateStoryDto,
        response: StoryResponseDto,
        status: HttpStatus.CREATED,
    })
    @Post()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'image', maxCount: 1 },
                { name: 'video', maxCount: 1 },
            ],
            {
                storage: createStorageConfig('stories'),
                fileFilter: fileFilter,
                limits: {
                    fileSize: 20 * 1024 * 1024,
                },
            },
        ),
    )
    async create(
        @CurrentUser() user: JwtPayload,
        @Body() createStoryDto: CreateStoryDto,
        @UploadedFiles()
        files: {
            image?: Express.Multer.File[];
            video?: Express.Multer.File[];
        },
    ): Promise<StoryResponseDto> {
        return this.storyService.create(createStoryDto, files, user.sub);
    }

    @ApiDocGenericResponse({
        summary: 'Get all my stories',
        description: 'Get all my stories for the authenticated user.',
        auth: true,
        response: StoryResponseDto,
        status: HttpStatus.OK,
    })
    @Get()
    @UseGuards(JwtAuthGuard)
    async findActiveStoriesByUserId(@CurrentUser() user: JwtPayload): Promise<StoryResponseDto[]> {
        return this.storyService.findActiveStoriesByUserId(user.sub);
    }

    @ApiDocGenericResponse({
        summary: 'Get stories feed (Mutual Contact only)',
        description: 'Returns stories from users who saved your contact AND you saved theirs.',
        auth: true,
        response: StoryResponseDto,
        status: HttpStatus.OK,
    })
    @Get('feed')
    @UseGuards(JwtAuthGuard)
    async getMutualStoriesFeed(@CurrentUser() user: JwtPayload): Promise<StoryResponseDto[]> {
        return this.storyService.getMutualStoriesFeed(user.sub);
    }
}
