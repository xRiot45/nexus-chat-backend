import { GroupRole } from 'src/common/enums/group-role.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BaseEntity } from 'src/shared/entity/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { GroupEntity } from './group.entity';

@Entity('group_members')
export class GroupMemberEntity extends BaseEntity {
    @Column({ name: 'groupId' })
    groupId: string;

    @Column({ name: 'userId' })
    userId: string;

    @Column({
        type: 'enum',
        enum: GroupRole,
        default: GroupRole.MEMBER,
    })
    role: string;

    @ManyToOne(() => GroupEntity, group => group.members, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'groupId' })
    group: GroupEntity;

    @ManyToOne(() => UserEntity, user => user.groupMemberships)
    @JoinColumn({ name: 'userId' })
    user: UserEntity;

    @Column({
        name: 'joinedAt',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    joinedAt: Date;
}
