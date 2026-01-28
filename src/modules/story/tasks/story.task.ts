import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from 'src/core/logger/logger.service';
import { LessThan, Repository } from 'typeorm';
import { StoryEntity } from '../entities/story.entity';

@Injectable()
export class StoryTask {
    constructor(
        @InjectRepository(StoryEntity)
        private readonly storyRepository: Repository<StoryEntity>,
        private readonly logger: LoggerService,
    ) {}

    /**
     * Runs a daily cron job to clean up expired stories and their associated files.
     *
     * @returns A promise that resolves when the cleanup process is complete.
     * @throws {InternalServerErrorException} If an unexpected error occurs during the cleanup process.
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCronExpiredStories(): Promise<void> {
        const context = `${StoryTask.name}.handleCronExpiredStories`;
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
        }
    }
}
