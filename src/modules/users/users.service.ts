import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from 'src/core/logger/logger.service';
import { Repository } from 'typeorm';
import { UserSearchResponseDto } from './dto/user-search-response.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        private readonly logger: LoggerService,
    ) {}

    async searchUsers(query: string, userId: string): Promise<UserSearchResponseDto[]> {
        const context = `${UsersService.name}.searchUsers`;
        this.logger.debug(`Starting search for query: "${query}"`, context);

        if (!query) return [];

        try {
            const users = await this.userRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.addedBy', 'contact', 'contact.userId = :userId', {
                    userId,
                })
                .where('(user.username LIKE :query OR user.fullName LIKE :query)', {
                    query: `%${query}%`,
                })
                .andWhere('user.id != :userId', {
                    userId,
                })
                .select([
                    'user.id',
                    'user.username',
                    'user.fullName',
                    'user.avatarUrl',
                    'user.bio',
                    'user.isVerified',
                    'user.status',
                    'user.lastSeenAt',
                    'contact.id',
                ])
                .take(20)
                .getMany();

            this.logger.debug(`Found ${users.length} users for query: "${query}"`, context);

            return users.map(user => UserSearchResponseDto.fromEntity(user));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to search for users: ${message}`, (error as Error).stack, context);
            throw new InternalServerErrorException('Failed to search for users in database');
        }
    }
}
