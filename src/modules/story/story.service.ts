import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { LoggerService } from 'src/core/logger/logger.service';
import { deleteFile } from 'src/shared/utils/file-upload.util';
import { DeepPartial, Repository } from 'typeorm';
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
}
