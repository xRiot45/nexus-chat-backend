import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BaseEntity } from 'src/shared/entity/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { GroupMemberEntity } from './group-member.entity';

@Entity('groups')
export class GroupEntity extends BaseEntity {
    @Column({
        type: 'varchar',
        length: 100,
        nullable: false,
    })
    name: string;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    description: string;

    @Column({
        type: 'text',
        nullable: true,
    })
    iconUrl: string | null;

    @Column({ name: 'ownerId' })
    ownerId: string;

    @ManyToOne(() => UserEntity, user => user.groups, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ownerId' })
    owner: UserEntity;

    @OneToMany(() => GroupMemberEntity, member => member.group)
    members: GroupMemberEntity[];
}
