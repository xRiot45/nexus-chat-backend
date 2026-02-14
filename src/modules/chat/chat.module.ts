import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerService } from 'src/core/logger/logger.service';
import { TokenService } from 'src/core/services/token.service';
import { GroupMemberEntity } from '../groups/entities/group-member.entity';
import { GroupsModule } from '../groups/groups.module';
import { UserEntity } from '../users/entities/user.entity';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([ConversationEntity, MessageEntity, UserEntity, GroupMemberEntity]),
        GroupsModule,
    ],
    controllers: [ChatController],
    providers: [ChatService, ChatGateway, JwtService, ConfigService, LoggerService, TokenService],
})
export class ChatModule {}
