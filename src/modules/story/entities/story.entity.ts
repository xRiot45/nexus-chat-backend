import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BaseEntity } from 'src/shared/entity/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('stories')
export class StoryEntity extends BaseEntity {
    @Column({ name: 'imageUrl', type: 'text', nullable: true })
    imageUrl: string;

    @Column({ name: 'videoUrl', type: 'text', nullable: true })
    videoUrl: string;

    @Column({ type: 'text', nullable: true })
    caption: string;

    @Column({
        name: 'expiresAt',
        type: 'timestamp',
        default: () => "NOW() + INTERVAL '24 hours'",
    })
    expiresAt: Date;

    // --- Relations ---

    @Column({ name: 'userId' })
    userId: string;

    @ManyToOne(() => UserEntity, user => user.stories, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;
}
