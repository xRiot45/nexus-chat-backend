import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { ContactsModule } from './contacts/contacts.module';
import { StoryModule } from './story/story.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';

@Module({
    imports: [UsersModule, AuthModule, ContactsModule, ChatModule, StoryModule, GroupsModule],
    exports: [],
    controllers: [],
    providers: [],
})
export class ModulesModule {}
