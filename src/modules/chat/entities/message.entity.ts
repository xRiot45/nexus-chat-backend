import { GroupEntity } from 'src/modules/groups/entities/group.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BaseEntity } from 'src/shared/entity/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ConversationEntity } from './conversation.entity';

@Entity('messages')
export class MessageEntity extends BaseEntity {
    @Column({
        name: 'content',
        type: 'text',
    })
    content: string;

    @Column({
        name: 'senderId',
        type: 'varchar',
    })
    senderId: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'senderId' })
    sender: UserEntity;

    // --- 1 ON 1 CHAT (Conversation) ---
    @Column({
        name: 'conversationId',
        type: 'varchar',
        nullable: true,
    })
    conversationId: string | null;

    @ManyToOne(() => ConversationEntity, conversation => conversation.messages)
    @JoinColumn({ name: 'conversationId' })
    conversation: ConversationEntity;

    // --- GROUP CHAT ---
    @Column({
        name: 'groupId',
        type: 'varchar',
        nullable: true,
    })
    groupId: string | null;

    @ManyToOne(() => GroupEntity, group => group.messages, {
        nullable: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'groupId' })
    group: GroupEntity;

    @Column({
        name: 'isRead',
        type: 'boolean',
        default: false,
    })
    isRead: boolean;

    @Column({
        name: 'readAt',
        type: 'timestamp',
        nullable: true,
    })
    readAt: Date | null;
}
