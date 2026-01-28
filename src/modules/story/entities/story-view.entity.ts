import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BaseEntity } from 'src/shared/entity/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { StoryEntity } from './story.entity';

@Entity('story_views')
@Unique(['storyId', 'viewerId'])
export class StoryViewEntity extends BaseEntity {
    @Column()
    storyId: string;

    @Column()
    viewerId: string;

    @ManyToOne(() => StoryEntity, story => story.views, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'storyId' })
    story: StoryEntity;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'viewerId' })
    viewer: UserEntity;
}
