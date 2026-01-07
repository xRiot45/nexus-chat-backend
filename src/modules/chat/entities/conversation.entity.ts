import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BaseEntity } from 'src/shared/entity/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { MessageEntity } from './message.entity';

@Entity('conversations')
@Unique(['creatorId', 'recipientId'])
export class ConversationEntity extends BaseEntity {
    // user yang memulai percakapan pertama kali
    @Column({
        name: 'creatorId',
        type: 'varchar',
    })
    creatorId: string;

    // user lawan bicara
    @Column({
        name: 'recipientId',
        type: 'varchar',
    })
    recipientId: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'creatorId' })
    creator: UserEntity;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'recipientId' })
    recipient: UserEntity;

    @OneToMany(() => MessageEntity, message => message.conversation)
    messages: MessageEntity[];
}
