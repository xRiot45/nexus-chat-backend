import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { LoggerService } from 'src/core/logger/logger.service';
import { deleteOldAvatar } from 'src/shared/utils/file-upload.util';
import { Repository } from 'typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserSearchResponseDto } from './dto/user-search-response.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        private readonly logger: LoggerService,
    ) {}

    /**
     * Searches for users with the given query and returns the results as an array of UserSearchResponseDto.
     * @param query The search query to search for users.
     * @param userId The ID of the user performing the search.
     * @returns A promise of an array of UserSearchResponseDto containing the search results.
     * @throws InternalServerErrorException If an unexpected error occurs during the search process.
     */
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

    /**
     * Updates the profile of the user with the given ID.
     * @param userId The ID of the user to be updated.
     * @param updateProfileDto The request data transfer object containing the updated profile information.
     * @param avatarFile The file containing the user's new avatar.
     * @returns A promise of the UserResponseDto containing the updated user information.
     * @throws NotFoundException If the user with the given ID is not found.
     * @throws ConflictException If the username is already taken.
     * @throws InternalServerErrorException If an unexpected error occurs during the update process or saving the user in the database.
     */
    async updateProfile(
        userId: string,
        updateProfileDto: UpdateProfileDto,
        avatarFile?: Express.Multer.File,
    ): Promise<UserResponseDto> {
        const context = `${UsersService.name}.updateProfile`;
        this.logger.log(`Starting update profile process for user ID: ${userId}`, context);

        const user = await this.userRepository.findOne({
            where: {
                id: userId,
            },
        });

        if (!user) {
            this.logger.error(`User with ID ${userId} not found`, context);
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        if (updateProfileDto.username && updateProfileDto.username !== user.username) {
            const existingUser = await this.userRepository.findOne({
                where: {
                    username: updateProfileDto.username,
                },
            });

            if (existingUser) {
                this.logger.warn(`Username '${updateProfileDto.username}' is already taken`, context);
                throw new ConflictException('Username is already taken');
            }
            user.username = updateProfileDto.username;
        }

        if (updateProfileDto.fullName) {
            user.fullName = updateProfileDto.fullName;
        }
        if (updateProfileDto.bio) {
            user.bio = updateProfileDto.bio;
        }

        if (avatarFile) {
            if (user.avatarUrl) {
                deleteOldAvatar(user.avatarUrl);
            }

            const avatarUrl = `/uploads/avatars/${avatarFile.filename}`;
            user.avatarUrl = avatarUrl;

            this.logger.log(`Avatar updated for user ${userId}: ${avatarFile.filename}`, context);
        }

        try {
            const updatedUser = await this.userRepository.save(user);
            this.logger.log(`Profile updated successfully for user ID: ${userId}`, context);

            return plainToInstance(UserResponseDto, updatedUser, {
                excludeExtraneousValues: true,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            const errorStack = error instanceof Error ? error.stack : '';

            this.logger.error(`Failed to update profile for user ${userId} : ${errorMessage}`, errorStack, context);
            throw error;
        }
    }
}
