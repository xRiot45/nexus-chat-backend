import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContactsModule } from './contacts/contacts.module';

@Module({
    imports: [UsersModule, AuthModule, ContactsModule],
    exports: [],
    controllers: [],
    providers: [],
})
export class ModulesModule {}
