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

    @Column({
        name: 'conversationId',
        type: 'varchar',
    })
    conversationId: string;

    @ManyToOne(() => ConversationEntity, conversation => conversation.messages)
    @JoinColumn({ name: 'conversationId' })
    conversation: ConversationEntity;
}
