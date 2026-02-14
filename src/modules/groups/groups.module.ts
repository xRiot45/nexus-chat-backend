import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerService } from 'src/core/logger/logger.service';
import { TokenService } from 'src/core/services/token.service';
import { UserEntity } from '../users/entities/user.entity';
import { GroupMemberEntity } from './entities/group-member.entity';
import { GroupEntity } from './entities/group.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
    imports: [TypeOrmModule.forFeature([GroupEntity, GroupMemberEntity, UserEntity])],
    controllers: [GroupsController],
    providers: [GroupsService, LoggerService, JwtService, TokenService],
    exports: [GroupsService],
})
export class GroupsModule {}
