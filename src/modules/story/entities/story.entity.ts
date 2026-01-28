import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BaseEntity } from 'src/shared/entity/base.entity';
import { dateUtil } from 'src/shared/utils/date.util';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

dayjs.extend(utc);
dayjs.extend(timezone);

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

    // --- Relations ---

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
}
