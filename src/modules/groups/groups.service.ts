import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupRole } from 'src/common/enums/group-role.enum';
import { LoggerService } from 'src/core/logger/logger.service';
import { deleteFile } from 'src/shared/utils/file-upload.util';
import { mapToDto } from 'src/shared/utils/transformer.util';
import { In, Repository } from 'typeorm';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { InviteMemberDto, InviteMemberResponseDto } from './dto/invite-member.dto';
import { GroupMemberEntity } from './entities/group-member.entity';
import { GroupEntity } from './entities/group.entity';

@Injectable()
export class GroupsService {
    constructor(
        @InjectRepository(GroupEntity)
        private readonly groupRepository: Repository<GroupEntity>,
        @InjectRepository(GroupMemberEntity)
        private readonly groupMemberRepository: Repository<GroupMemberEntity>,
        private readonly logger: LoggerService,
    ) {}

    /**
     * Creates a new group.
     * @param ownerId The ID of the user that owns the group.
     * @param createGroupDto The request data transfer object containing the group name and description.
     * @param iconFile The file containing the group icon.
     * @returns A promise of the GroupResponseDto containing the newly created group.
     * @throws InternalServerErrorException If an unexpected error occurs during the creation of the group.
     */
    async create(
        ownerId: string,
        createGroupDto: CreateGroupDto,
        iconFile: Express.Multer.File,
    ): Promise<GroupResponseDto> {
        const context = `${GroupsService.name}.create`;
        this.logger.log(`Starting create group process for owner ID: ${ownerId}`, context);

        const iconUrl = iconFile ? `/uploads/icons/${iconFile.filename}` : null;
        return this.groupRepository.manager.transaction(async transactionalEntityManager => {
            try {
                const newGroup = transactionalEntityManager.create(GroupEntity, {
                    name: createGroupDto.name,
                    description: createGroupDto.description,
                    iconUrl: iconUrl,
                    ownerId: ownerId,
                });

                const savedGroup = await transactionalEntityManager.save(newGroup);
                const firstMember = transactionalEntityManager.create(GroupMemberEntity, {
                    groupId: savedGroup.id,
                    userId: ownerId,
                    role: GroupRole.OWNER,
                });

                await transactionalEntityManager.save(firstMember);
                const completeGroupData = await transactionalEntityManager.findOne(GroupEntity, {
                    where: { id: savedGroup.id },
                    relations: ['owner'],
                });

                this.logger.log(`Group successfully created with ID: ${savedGroup.id}`, context);
                return mapToDto(GroupResponseDto, completeGroupData);
            } catch (error) {
                this.logger.error(`Failed to create group: ${(error as Error).message}`, context);

                if (iconFile) deleteFile(iconFile.filename);

                throw new InternalServerErrorException('Failed to create group, please try again later.');
            }
        });
    }

    /**
     * Invites members to a group.
     * @param inviteMemberDto The request data transfer object containing the group ID and member IDs to be invited.
     * @returns A promise of the InviteMemberResponseDto containing the number of members successfully invited and the number of members that were already members of the group.
     * @throws ConflictException If the all specified members are already in the group.
     * @throws InternalServerErrorException If an unexpected error occurs during the invitation of members.
     */
    async inviteMembers(inviteMemberDto: InviteMemberDto): Promise<InviteMemberResponseDto> {
        const context = `${GroupsService.name}.inviteMembers`;
        const { groupId, memberIds } = inviteMemberDto;
        this.logger.log(`Starting invite members process for group ID: ${groupId}`, context);

        try {
            const existingMembers = await this.groupMemberRepository.find({
                where: {
                    groupId: groupId,
                    userId: In(memberIds),
                },
                select: ['userId'],
            });

            const existingUserIds = existingMembers.map(member => member.userId);
            const newUserIds = memberIds.filter(id => !existingUserIds.includes(id));

            if (newUserIds.length === 0) {
                this.logger.log(`All specified members are already in the group ID: ${groupId}`, context);
                throw new ConflictException('All specified members are already in the group.');
            }

            const newGroupMembers = newUserIds.map(userId => {
                return this.groupMemberRepository.create({
                    groupId: groupId,
                    userId: userId,
                    role: GroupRole.MEMBER,
                });
            });

            await this.groupMemberRepository.save(newGroupMembers);
            this.logger.log(`Successfully invited ${newUserIds.length} members to group ID: ${groupId}`, context);

            return mapToDto(InviteMemberResponseDto, {
                count: newUserIds.length,
                skippedCount: existingUserIds.length,
            });
        } catch (error) {
            if (error instanceof ConflictException) throw error;

            this.logger.error(`Failed to invite members: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Failed to invite members, please try again later.');
        }
    }
}
