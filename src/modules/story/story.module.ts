import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerService } from 'src/core/logger/logger.service';
import { TokenService } from 'src/core/services/token.service';
import { ContactEntity } from '../contacts/entities/contact.entity';
import { UserEntity } from '../users/entities/user.entity';
import { StoryViewEntity } from './entities/story-view.entity';
import { StoryEntity } from './entities/story.entity';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { StoryTask } from './tasks/story.task';

@Module({
    imports: [TypeOrmModule.forFeature([StoryEntity, ContactEntity, UserEntity, StoryViewEntity])],
    controllers: [StoryController],
    providers: [StoryService, StoryTask, LoggerService, JwtService, TokenService],
})
export class StoryModule {}
