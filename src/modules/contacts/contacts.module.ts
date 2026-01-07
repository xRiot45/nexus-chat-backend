import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerService } from 'src/core/logger/logger.service';
import { TokenService } from 'src/core/services/token.service';
import { UserEntity } from '../users/entities/user.entity';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { ContactEntity } from './entities/contact.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ContactEntity, UserEntity])],
    controllers: [ContactsController],
    providers: [ContactsService, LoggerService, JwtService, TokenService],
})
export class ContactsModule {}
