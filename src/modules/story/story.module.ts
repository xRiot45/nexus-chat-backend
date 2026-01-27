import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryEntity } from './entities/story.entity';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';

@Module({
    imports: [TypeOrmModule.forFeature([StoryEntity])],
    controllers: [StoryController],
    providers: [StoryService],
})
export class StoryModule {}
