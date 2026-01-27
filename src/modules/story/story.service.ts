import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { LoggerService } from 'src/core/logger/logger.service';
import { deleteFile } from 'src/shared/utils/file-upload.util';
import { DeepPartial, In, LessThan, MoreThan, Repository } from 'typeorm';
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
     * Creates a new story with the given data and files.
     *
     * @param {CreateStoryDto} createStoryDto - The data transfer object containing the story's caption.
     * @param {Object} files - An object containing the uploaded image and video files.
     * @param {Express.Multer.File[]} files.image - An array of image files.
     * @param {Express.Multer.File[]} files.video - An array of video files.
     * @param {string} userId - The ID of the user creating the story.
     * @return {Promise<StoryResponseDto>} A promise that resolves to the newly created story.
     * @throws {InternalServerErrorException} If an error occurs while saving the story to the database.
     */
    async create(
        createStoryDto: CreateStoryDto,
        files: { image?: Express.Multer.File[]; video?: Express.Multer.File[] },
        userId: string,
    ): Promise<StoryResponseDto> {
        const context = `${StoryService.name}.create`;
        this.logger.log(`Memulai proses simpan story untuk user: ${userId}`, context);

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

            return plainToInstance(StoryResponseDto, result, {
                excludeExtraneousValues: true,
            });
        } catch (error) {
            this.logger.error(`Failed to save story: ${(error as Error).message}`, context);
            if (imageUrl) deleteFile(imageUrl);
            if (videoUrl) deleteFile(videoUrl);
            throw new InternalServerErrorException('Gagal menyimpan story ke database');
        }
    }

    /**
     * Retrieves the active stories for a given user.
     *
     * @param {string} userId - The ID of the user.
     * @return {Promise<StoryResponseDto[]>} A promise that resolves to an array of active story response DTOs.
     */
    async findActiveStoriesByUserId(userId: string): Promise<StoryResponseDto[]> {
        const context = `${StoryService.name}.findActiveStoriesByUserId`;

        try {
            const stories = await this.storyRepository.find({
                where: {
                    userId: userId,
                    expiresAt: MoreThan(new Date()),
                },
                relations: ['user'],
                order: { createdAt: 'DESC' },
            });

            return plainToInstance(StoryResponseDto, stories, {
                excludeExtraneousValues: true,
            });
        } catch (error) {
            this.logger.error(`Failed to fetch stories: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Failed to fetch user stories');
        }
    }

    /**
     * Retrieves the mutual stories feed for a given user.
     * The mutual stories feed consists of stories from the user's followers
     * and the user itself.
     * @param {string} userId - The ID of the user.
     * @return {Promise<StoryResponseDto[]>} A promise that resolves to an array of story response DTOs.
     */
    async getMutualStoriesFeed(userId: string): Promise<StoryResponseDto[]> {
        const context = `${StoryService.name}.getMutualStoriesFeed`;
        this.logger.log(`Fetching mutual stories feed for user: ${userId}`, context);

        try {
            const followers = await this.contactRepository.find({
                where: {
                    contactUserId: userId,
                },
            });

            const followerIds = followers.map(f => f.userId);
            if (followerIds.length === 0) {
                return await this.findStoriesByUsers([userId]);
            }

            const mutuals = await this.contactRepository.find({
                where: {
                    userId: userId,
                    contactUserId: In(followerIds),
                },
            });

            const mutualIds = [...new Set([...mutuals.map(m => m.contactUserId), userId])];
            return await this.findStoriesByUsers(mutualIds);
        } catch (error) {
            this.logger.error(`Failed to fetch mutual stories feed: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Failed to fetch mutual stories feed');
        }
    }

    /**
     * Runs a daily cron job to clean up expired stories and their associated files.
     *
     * @returns A promise that resolves when the cleanup process is complete.
     * @throws {InternalServerErrorException} If an unexpected error occurs during the cleanup process.
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCronExpiredStories(): Promise<void> {
        const context = `${StoryService.name}.handleCronExpiredStories`;
        this.logger.log('Running expired story cleanup process...', context);

        try {
            const expiredStories = await this.storyRepository.find({
                where: {
                    expiresAt: LessThan(new Date()),
                },
            });

            if (expiredStories.length === 0) {
                this.logger.log('There are no expired stories to delete.', context);
                return;
            }
        } catch (error) {
            this.logger.error(`Failed to fetch expired stories: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Failed to fetch expired stories');
        }
    }

    private async findStoriesByUsers(userIds: string[]): Promise<StoryResponseDto[]> {
        const stories = await this.storyRepository.find({
            where: {
                userId: In(userIds),
                expiresAt: MoreThan(new Date()),
            },
            relations: { user: true },
            order: { createdAt: 'DESC' },
        });

        return plainToInstance(StoryResponseDto, stories, {
            excludeExtraneousValues: true,
        });
    }
}
