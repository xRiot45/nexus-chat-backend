import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerService } from 'src/core/logger/logger.service';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { ContactEntity } from './entities/contact.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ContactEntity])],
    controllers: [ContactsController],
    providers: [ContactsService, LoggerService, JwtService],
})
export class ContactsModule {}
