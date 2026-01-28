import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BaseEntity } from 'src/shared/entity/base.entity';
import { dateUtil } from 'src/shared/utils/date.util';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, VirtualColumn } from 'typeorm';
import { StoryViewEntity } from './story-view.entity';

@Entity('stories')
export class StoryEntity extends BaseEntity {
    @Column({ name: 'imageUrl', type: 'text', nullable: true })
    imageUrl: string;

    @Column({ name: 'videoUrl', type: 'text', nullable: true })
    videoUrl: string;

    @Column({ type: 'text', nullable: true })
    caption: string;

    @Column({ name: 'expiresAt', type: 'datetime' })
    expiresAt: Date;

    // TODO : Relations To User Entity

    @Column({ name: 'userId' })
    userId: string;

    @ManyToOne(() => UserEntity, user => user.stories, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;

    @BeforeInsert()
    setExpirationDate(): void {
        const expiration = dateUtil().tz('Asia/Jakarta').add(1, 'day').format('YYYY-MM-DD HH:mm:ss');
        this.expiresAt = expiration as unknown as Date;
    }

    // TODO :  Relation To Story View Entity

    @OneToMany(() => StoryViewEntity, view => view.story)
    views: StoryViewEntity[];

    @VirtualColumn({ query: alias => `SELECT COUNT(*) FROM story_views WHERE storyId = ${alias}.id` })
    viewsCount: number;
}
