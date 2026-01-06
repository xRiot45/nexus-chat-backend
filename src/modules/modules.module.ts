import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContactsModule } from './contacts/contacts.module';
import { ChatModule } from './chat/chat.module';

@Module({
    imports: [UsersModule, AuthModule, ContactsModule, ChatModule],
    exports: [],
    controllers: [],
    providers: [],
})
export class ModulesModule {}
