import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from 'src/core/logger/logger.service';
import { dateUtil } from 'src/shared/utils/date.util';
import { deleteFile } from 'src/shared/utils/file-upload.util';
import { mapToDto } from 'src/shared/utils/transformer.util';
import { DeepPartial, In, MoreThan, Repository } from 'typeorm';
import { ContactEntity } from '../contacts/entities/contact.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { StoryResponseDto } from './dto/story-response.dto';
import { StoryEntity } from './entities/story.entity';

@Injectable()
export class StoryService {
    constructor(
        @InjectRepository(StoryEntity)
        private readonly storyRepository: Repository<StoryEntity>,
        @InjectRepository(ContactEntity)
        private readonly contactRepository: Repository<ContactEntity>,
        private readonly logger: LoggerService,
    ) {}

    /**
     * Create a new story with the given information.
     * @param createStoryDto The request data transfer object containing the story information.
     * @param files The files to be uploaded, containing an image and/or video.
     * @param userId The ID of the user creating the story.
     * @returns A promise of the StoryResponseDto containing the newly created story.
     * @throws InternalServerErrorException If an unexpected error occurs during the creation of the story.
     */
    async create(
        createStoryDto: CreateStoryDto,
        files: { image?: Express.Multer.File[]; video?: Express.Multer.File[] },
        userId: string,
    ): Promise<StoryResponseDto> {
        const context = `${StoryService.name}.create`;
        this.logger.log(`Starting the process of saving the story for the user: ${userId}`, context);

        const imageUrl = files.image?.[0] ? `/uploads/stories/${files.image[0].filename}` : null;
        const videoUrl = files.video?.[0] ? `/uploads/stories/${files.video[0].filename}` : null;

        try {
            const newStory = this.storyRepository.create({
                userId,
                caption: createStoryDto.caption,
                imageUrl,
                videoUrl,
            } as DeepPartial<StoryEntity>);

            const savedStory = await this.storyRepository.save(newStory);

            const result = await this.storyRepository.findOne({
                where: { id: savedStory.id },
                relations: ['user'],
            });

            return mapToDto(StoryResponseDto, result);
        } catch (error) {
            this.logger.error(`Failed to save story: ${(error as Error).message}`, context);

            if (imageUrl) deleteFile(imageUrl);
            if (videoUrl) deleteFile(videoUrl);
            throw new InternalServerErrorException('Gagal menyimpan story ke database');
        }
    }

    /**
     * Retrieves the active stories of a user with the given ID.
     * Active stories are stories that have not expired yet.
     * @param userId The ID of the user to fetch active stories for.
     * @returns A promise of an array of StoryResponseDto containing the active stories of the user.
     * @throws InternalServerErrorException If an unexpected error occurs during the retrieval of the active stories.
     */
    async findActiveStoriesByUserId(userId: string): Promise<StoryResponseDto[]> {
        const context = `${StoryService.name}.findActiveStoriesByUserId`;
        try {
            return await this.findStoriesByUserIds([userId]);
        } catch (error) {
            this.logger.error(`Failed to fetch stories: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Gagal mengambil story user');
        }
    }

    /**
     * Retrieves the mutual stories feed for the given user ID.
     * The mutual stories feed consists of stories from users that the given user follows and are also followed by the given user.
     * @param userId The ID of the user to fetch the mutual stories feed for.
     * @returns A promise of an array of StoryResponseDto containing the mutual stories of the user.
     * @throws InternalServerErrorException If an unexpected error occurs during the retrieval of the mutual stories feed.
     */
    async getMutualStoriesFeed(userId: string): Promise<StoryResponseDto[]> {
        const context = `${StoryService.name}.getMutualStoriesFeed`;
        this.logger.log(`Fetching mutual stories feed for user: ${userId}`, context);

        try {
            const followers = await this.contactRepository.find({
                where: { contactUserId: userId },
            });

            const followerIds = followers.map(f => f.userId);

            if (followerIds.length === 0) {
                return [];
            }

            const mutuals = await this.contactRepository.find({
                where: {
                    userId: userId,
                    contactUserId: In(followerIds),
                },
            });

            const mutualIds = mutuals.map(m => m.contactUserId);

            if (mutualIds.length === 0) {
                return [];
            }

            return await this.findStoriesByUserIds(mutualIds);
        } catch (error) {
            this.logger.error(`Failed to fetch mutual stories feed: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Gagal mengambil feed story mutual');
        }
    }

    /**
     * Menghapus story.
     */
    async remove(id: string, userId: string): Promise<void> {
        const context = `${StoryService.name}.remove`;
        this.logger.log(`Starting story deletion: ${id}`, context);

        try {
            const story = await this.storyRepository.findOne({
                where: { id, userId },
            });

            if (!story) {
                this.logger.log(`Story not found or unauthorized: ${id}`, context);
                return;
            }

            if (story.imageUrl) deleteFile(story.imageUrl);
            if (story.videoUrl) deleteFile(story.videoUrl);

            await this.storyRepository.remove(story);
            this.logger.log(`Story deleted successfully: ${id}`, context);
        } catch (error) {
            this.logger.error(`Failed to delete story: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Gagal menghapus story');
        }
    }

    private async findStoriesByUserIds(userIds: string[]): Promise<StoryResponseDto[]> {
        const now = dateUtil().tz('Asia/Jakarta').toDate();

        const stories = await this.storyRepository.find({
            where: {
                userId: In(userIds),
                expiresAt: MoreThan(now),
            },
            relations: { user: true },
            order: { createdAt: 'DESC' },
        });

        return mapToDto(StoryResponseDto, stories);
    }
}
