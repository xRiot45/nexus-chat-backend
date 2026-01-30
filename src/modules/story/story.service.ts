import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from 'src/core/logger/logger.service';
import { dateUtil } from 'src/shared/utils/date.util';
import { deleteFile } from 'src/shared/utils/file-upload.util';
import { mapToDto } from 'src/shared/utils/transformer.util';
import { DeepPartial, In, MoreThan, Repository } from 'typeorm';
import { ContactEntity } from '../contacts/entities/contact.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { StoryResponseDto } from './dto/story-response.dto';
import { StoryViewerResponseDto } from './dto/story-viewer-response.dto';
import { StoryViewEntity } from './entities/story-view.entity';
import { StoryEntity } from './entities/story.entity';

@Injectable()
export class StoryService {
    constructor(
        @InjectRepository(StoryEntity)
        private readonly storyRepository: Repository<StoryEntity>,
        @InjectRepository(StoryViewEntity)
        private readonly storyViewRepository: Repository<StoryViewEntity>,
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

        const imageFile = files.image?.[0];
        const videoFile = files.video?.[0];
        const imageUrl = imageFile ? `/uploads/stories/${imageFile.filename}` : null;
        const videoUrl = videoFile ? `/uploads/stories/${videoFile.filename}` : null;

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
                select: ['userId'],
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
                select: ['contactUserId', 'alias'],
            });

            if (mutuals.length === 0) {
                return [];
            }

            const aliasMap: Record<string, string> = {};
            const mutualIds: string[] = [];

            mutuals.forEach(m => {
                mutualIds.push(m.contactUserId);
                if (m.alias) {
                    aliasMap[m.contactUserId] = m.alias;
                }
            });

            const stories = await this.findStoriesByUserIds(mutualIds);

            stories.forEach(story => {
                const userAlias = aliasMap[story.user.id];
                if (userAlias) {
                    story.user.fullName = userAlias;
                }
            });

            return stories;
        } catch (error) {
            this.logger.error(`Failed to fetch mutual stories feed: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Gagal mengambil feed story mutual');
        }
    }

    /**
     * Deletes a story associated with the given user ID and story ID.
     * If the story is not found or unauthorized, no action is taken.
     * If the story has an image or video associated with it, the image or video is deleted from the file system before the story is deleted.
     * @param id The ID of the story to be deleted.
     * @param userId The ID of the user to delete the story for.
     * @returns A promise that resolves when the story is successfully deleted.
     * @throws InternalServerErrorException If an unexpected error occurs during the deletion of the story.
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

    /**
     * Marks a story as seen by the given viewer ID.
     * If the story is not found or has expired, no action is taken.
     * If the story has already been marked as seen by the viewer, no action is taken.
     * @param storyId The ID of the story to mark as seen.
     * @param viewerId The ID of the viewer marking the story as seen.
     * @returns A promise that resolves when the story is successfully marked as seen.
     * @throws InternalServerErrorException If an unexpected error occurs during the marking of the story as seen.
     */
    async markStoryAsSeen(storyId: string, viewerId: string): Promise<void> {
        const context = `${StoryService.name}.markStoryAsSeen`;
        this.logger.log(`Marking story as seen: ${storyId}`, context);

        try {
            const story = await this.storyRepository.findOne({
                where: {
                    id: storyId,
                    expiresAt: MoreThan(dateUtil().tz('Asia/Jakarta').toDate()),
                },
            });

            if (!story) {
                this.logger.log(`Story not found or expired: ${storyId}`, context);
                return;
            }

            if (story?.userId === viewerId) return;

            await this.storyViewRepository.upsert(
                {
                    storyId: storyId,
                    viewerId: viewerId,
                },
                ['storyId', 'viewerId'],
            );

            this.logger.log(`Story marked as seen: ${storyId}`, context);
        } catch (error) {
            this.logger.error(`Failed to mark story as seen: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Gagal mengubah story');
        }
    }

    /**
     * Retrieves the viewers of a story for a specific owner.
     *
     * @param {string} storyId - The ID of the story.
     * @param {string} userId - The ID of the owner of the story.
     * @return {Promise<StoryViewerResponseDto[]>} - A promise that resolves to an array of StoryViewerResponseDto objects representing the viewers of the story.
     * @throws {ForbiddenException} - If the owner does not have access to the story viewer data.
     * @throws {InternalServerErrorException} - If an unexpected error occurs during the retrieval of the story viewers.
     */
    async getStoryViewers(storyId: string, userId: string): Promise<StoryViewerResponseDto[]> {
        const context = `${StoryService.name}.getStoryViewers`;
        this.logger.log(`Get story viewers for storyId: ${storyId} by owner: ${userId}`, context);

        try {
            const story = await this.storyRepository.findOne({
                where: { id: storyId, userId: userId },
            });

            if (!story) {
                this.logger.log(`Story not found or unauthorized: ${storyId}`, context);
                throw new ForbiddenException('You do not have access to this story viewer data.');
            }

            const views = await this.storyViewRepository.find({
                where: { storyId: storyId },
                relations: { viewer: true },
                order: { createdAt: 'DESC' },
            });

            if (views.length === 0) {
                this.logger.log(`No viewers found for storyId: ${storyId}`, context);
                return [];
            }

            const viewerIds = views.map(v => v.viewer.id);
            const contacts = await this.contactRepository.find({
                where: {
                    userId: userId,
                    contactUserId: In(viewerIds),
                },
                select: ['contactUserId', 'alias'],
            });

            const aliasMap: Record<string, string> = {};
            contacts.forEach(c => {
                aliasMap[c.contactUserId] = c.alias;
            });

            const rawData = views.map(view => {
                const alias = aliasMap[view.viewer.id];
                return {
                    seenAt: view.createdAt,
                    user: {
                        ...view.viewer,
                        fullName: alias || view.viewer.fullName,
                    },
                };
            });

            return mapToDto(StoryViewerResponseDto, rawData);
        } catch (error) {
            if (error instanceof ForbiddenException) throw error;
            this.logger.error(`Failed to get story viewers: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Gagal mengambil data viewer story');
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
            order: { createdAt: 'ASC' },
        });

        return mapToDto(StoryResponseDto, stories);
    }
}
