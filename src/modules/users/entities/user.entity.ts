import { UserStatus } from 'src/common/enums/user-status.enum';
import { ConversationEntity } from 'src/modules/chat/entities/conversation.entity';
import { MessageEntity } from 'src/modules/chat/entities/message.entity';
import { ContactEntity } from 'src/modules/contacts/entities/contact.entity';
import { StoryEntity } from 'src/modules/story/entities/story.entity';
import { BaseEntity } from 'src/shared/entity/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity('users')
export class UserEntity extends BaseEntity {
    @Column({ unique: true, length: 50 })
    username: string;

    @Column({ name: 'fullName', length: 100 })
    fullName: string;

    @Column({ unique: true, length: 255 })
    email: string;

    @Column({ name: 'password', type: 'text' })
    password: string;

    @Column({ name: 'avatarUrl', type: 'text', nullable: true })
    avatarUrl: string;

    @Column({ type: 'text', nullable: true })
    bio: string;

    @Column({
        name: 'emailVerifiedAt',
        type: 'timestamp',
        nullable: true,
    })
    emailVerifiedAt: Date | null;

    @Column({
        name: 'isVerified',
        type: 'boolean',
        nullable: false,
        default: false,
    })
    isVerified: boolean;

    @Column({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.OFFLINE,
    })
    status: UserStatus;

    @Column({ name: 'currentRefreshToken', type: 'text', nullable: true })
    currentRefreshToken: string | null;

    @Column({ name: 'lastSeenAt', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    lastSeenAt: Date;

    // --- Relations ---

    // TODO --- Relasi Contact Management Feature ---

    @OneToMany(() => ContactEntity, contact => contact.user)
    contacts: ContactEntity[];

    @OneToMany(() => ContactEntity, contact => contact.contactUser)
    addedBy: ContactEntity[];

    // TODO --- Relasi Chat Feature ---

    // 1. Relasi ke Conversation sebagai CREATOR (Yang memulai chat)
    @OneToMany(() => ConversationEntity, conversation => conversation.creator)
    conversationsInitiated: ConversationEntity[];

    // 2. Relasi ke Conversation sebagai RECIPIENT (Lawan bicara)
    @OneToMany(() => ConversationEntity, conversation => conversation.recipient)
    conversationsReceived: ConversationEntity[];

    // 3. Relasi ke Message sebagai SENDER (Pengirim pesan)
    @OneToMany(() => MessageEntity, message => message.sender)
    messagesSent: MessageEntity[];

    // TODO --- Relasi Story Feature ---
    @OneToMany(() => StoryEntity, story => story.user)
    stories: StoryEntity[];
}
