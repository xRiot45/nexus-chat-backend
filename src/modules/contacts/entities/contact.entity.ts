import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BaseEntity } from 'src/shared/entity/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

@Entity('contacts')
@Unique(['userId', 'contactUserId'])
export class ContactEntity extends BaseEntity {
    @Column({
        type: 'varchar',
        length: 100,
        nullable: false,
    })
    alias: string;

    @Column({ name: 'userId' })
    userId: string;

    @ManyToOne(() => UserEntity, user => user.contacts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;

    @Column({ name: 'contactUserId' })
    contactUserId: string;

    @ManyToOne(() => UserEntity, user => user.addedBy, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'contactUserId' })
    contactUser: UserEntity;
}
