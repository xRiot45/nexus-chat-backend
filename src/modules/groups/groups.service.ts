import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupRole } from 'src/common/enums/group-role.enum';
import { LoggerService } from 'src/core/logger/logger.service';
import { UserShortResponseDto } from 'src/shared/dto/user-short-response.dto';
import { deleteFile } from 'src/shared/utils/file-upload.util';
import { mapToDto } from 'src/shared/utils/transformer.util';
import { In, Repository } from 'typeorm';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { InviteMemberDto, InviteMemberResponseDto } from './dto/invite-member.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
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

    /**
     * Updates a group with the given ID.
     * @param groupId The ID of the group to be updated.
     * @param userId The ID of the user that owns the group.
     * @param updateGroupDto The request data transfer object containing the updated group information.
     * @param iconFile The file containing the group's new icon.
     * @returns A promise of the GroupResponseDto containing the updated group information.
     * @throws NotFoundException If the group with the given ID is not found.
     * @throws ForbiddenException If the user with the given ID does not own the group.
     * @throws InternalServerErrorException If an unexpected error occurs during the update of the group.
     */
    async update(
        groupId: string,
        userId: string, // Tambahkan userId untuk cek ownership
        updateGroupDto: UpdateGroupDto,
        iconFile?: Express.Multer.File,
    ): Promise<GroupResponseDto> {
        const context = `${GroupsService.name}.update`;

        try {
            const group = await this.groupRepository.findOne({
                where: { id: groupId },
                relations: ['owner'],
            });

            if (!group) {
                throw new NotFoundException(`Group with ID ${groupId} not found`);
            }

            if (group.owner.id !== userId) {
                throw new ForbiddenException('You do not have permission to update this group');
            }

            if (updateGroupDto.name) group.name = updateGroupDto.name;
            if (updateGroupDto.description) group.description = updateGroupDto.description;

            if (iconFile) {
                const newIconUrl = `/uploads/icons/${iconFile.filename}`;
                if (group.iconUrl) {
                    deleteFile(group.iconUrl);
                }
                group.iconUrl = newIconUrl;
            }

            const updatedGroup = await this.groupRepository.save(group);
            return mapToDto(GroupResponseDto, updatedGroup);
        } catch (error) {
            if (iconFile) deleteFile(`/uploads/icons/${iconFile.filename}`);

            this.logger.error(`Failed to update group: ${(error as Error).message}`, context);
            if (error instanceof HttpException) throw error;

            throw new InternalServerErrorException('Failed to update group');
        }
    }

    /**
     * Kicks a member from a group.
     * @param memberId The ID of the member to be kicked.
     * @param actorId The ID of the user that is kicking the member.
     * @param groupId The ID of the group from which the member will be kicked.
     * @throws BadRequestException If the actor tries to kick themselves.
     * @throws ForbiddenException If the actor does not have sufficient privileges to kick the member.
     * @throws NotFoundException If the target user is not a member of the group.
     * @throws InternalServerErrorException If an unexpected error occurs during the kick process.
     */
    async kickMember(memberId: string, actorId: string, groupId: string): Promise<void> {
        const context = `${GroupsService.name}.kickMember`;
        this.logger.log(`Attempting to kick member ${memberId} from group ${groupId} by actor ${actorId}`, context);

        if (memberId === actorId) {
            this.logger.warn(`Kick failed: Actor ${actorId} tried to kick themselves`, context);
            throw new BadRequestException('You cannot kick yourself');
        }

        try {
            const [actor, target] = await Promise.all([
                this.groupMemberRepository.findOne({ where: { groupId, userId: actorId } }),
                this.groupMemberRepository.findOne({ where: { groupId, userId: memberId } }),
            ]);

            if (!actor) {
                this.logger.error(`Kick failed: Actor ${actorId} is not a member of group ${groupId}`, context);
                throw new ForbiddenException('You are not a member of this group');
            }

            if (!target) {
                this.logger.warn(`Kick failed: Target ${memberId} is not found in group ${groupId}`, context);
                throw new NotFoundException('Target user is not a member of this group');
            }

            this.logger.debug(`Roles Check - Actor: ${actor.role}, Target: ${target.role}`, context);

            const isActorOwner = actor.role === GroupRole.OWNER;
            const isActorAdmin = actor.role === GroupRole.ADMIN;
            const isTargetOwner = target.role === GroupRole.OWNER;
            const isTargetAdmin = target.role === GroupRole.ADMIN;

            if (!isActorOwner && !isActorAdmin) {
                this.logger.warn(
                    `Permission Denied: User ${actorId} (Role: ${actor.role}) attempted to kick without sufficient privileges`,
                    context,
                );
                throw new ForbiddenException('Only owners or admins can kick members');
            }

            if (isActorAdmin && !isActorOwner) {
                if (isTargetOwner || isTargetAdmin) {
                    this.logger.warn(
                        `Hierarchy Violation: Admin ${actorId} tried to kick a ${target.role} (${memberId})`,
                        context,
                    );
                    throw new ForbiddenException('Admins cannot kick owners or other admins');
                }
            }

            await this.groupMemberRepository.remove(target);
            this.logger.log(`Success: Member ${memberId} removed from group ${groupId} by ${actorId}`, context);
        } catch (error) {
            if (error instanceof HttpException) throw error;

            this.logger.error(
                `Critical Error during kickMember: ${(error as Error).message}`,
                (error as Error).stack,
                context,
            );
            throw new InternalServerErrorException('An unexpected error occurred');
        }
    }

    /**
     * Deletes a group with the given ID.
     * If the group is not found, a NotFoundException is thrown.
     * If an unexpected error occurs during the deletion of the group, an InternalServerErrorException is thrown.
     * @param groupId The ID of the group to be deleted.
     * @returns A promise that resolves when the group is successfully deleted.
     * @throws NotFoundException If the group with the given ID is not found.
     * @throws InternalServerErrorException If an unexpected error occurs during the deletion of the group.
     */
    async remove(groupId: string): Promise<void> {
        const context = `${GroupsService.name}.remove`;
        this.logger.log(`Removing group with ID: ${groupId}`, context);

        try {
            const group = await this.groupRepository.findOne({ where: { id: groupId } });

            if (!group) {
                this.logger.warn(`Group with ID: ${groupId} not found`, context);
                throw new NotFoundException(`Group with ID ${groupId} not found`);
            }

            if (group.iconUrl) {
                deleteFile(group.iconUrl);
            }

            await this.groupRepository.remove(group);
            this.logger.log(`Group with ID: ${groupId} successfully removed`, context);
        } catch (error) {
            this.logger.error(`Failed to remove group: ${(error as Error).message}`, context);
            if (error instanceof HttpException) throw error;

            throw new InternalServerErrorException('Failed to remove group, please try again later.');
        }
    }

    /**
     * Removes a user from a group.
     * If the user is not a member of the group, a NotFoundException is thrown.
     * If the user is the owner of the group and there are other members, a BadRequestException is thrown.
     * If an unexpected error occurs during the removal of the user from the group, an InternalServerErrorException is thrown.
     * @param userId The ID of the user to be removed from the group.
     * @param groupId The ID of the group from which the user will be removed.
     * @returns A promise that resolves when the user is successfully removed from the group.
     * @throws NotFoundException If the user with the given ID is not a member of the group.
     * @throws BadRequestException If the user is an owner and there are other members in the group.
     * @throws InternalServerErrorException If an unexpected error occurs during the removal of the user from the group.
     */
    async leaveGroup(userId: string, groupId: string): Promise<void> {
        const context = `${GroupsService.name}.leaveGroup`;
        this.logger.log(`User ${userId} attempting to leave group ${groupId}`, context);

        try {
            const member = await this.groupMemberRepository.findOne({
                where: {
                    groupId,
                    userId,
                },
            });

            if (!member) {
                this.logger.warn(`Leave group failed: User ${userId} is not a member of group ${groupId}`, context);
                throw new NotFoundException('You are not a member of this group');
            }

            if (member.role === GroupRole.OWNER) {
                const memberCount = await this.groupMemberRepository.count({ where: { groupId } });
                if (memberCount > 1) {
                    this.logger.warn(
                        `Owner ${userId} tried to leave group ${groupId} without transferring ownership`,
                        context,
                    );
                    throw new BadRequestException(
                        'As an owner, you must transfer ownership to another member before leaving or delete the group.',
                    );
                } else {
                    this.logger.log(`Owner ${userId} is the last member. Deleting group ${groupId}`, context);
                    const group = await this.groupRepository.findOne({
                        where: { id: groupId },
                    });
                    if (group) await this.groupRepository.remove(group);
                    return;
                }
            }

            await this.groupMemberRepository.remove(member);
            this.logger.log(`User ${userId} successfully left group ${groupId}`, context);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error(`Failed to leave group: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Failed to leave group');
        }
    }

    /**
     * Changes the role of a member in a group.
     * @param groupId The ID of the group to change the role in.
     * @param memberId The ID of the member to change the role for.
     * @param requesterId The ID of the user that is performing the role change.
     * @param newRole The new role for the member.
     * @returns A promise that resolves when the role change is successful.
     * @throws ForbiddenException If the requester does not have permission to change roles in the group.
     * @throws NotFoundException If the member to be changed is not found in the group.
     * @throws InternalServerErrorException If an unexpected error occurs during the role change process.
     */
    // groups.service.ts

    async changeRoleMember(groupId: string, memberId: string, requesterId: string, newRole: GroupRole): Promise<void> {
        const context = `${GroupsService.name}.changeRoleMember`;
        this.logger.log(
            `Attempting to change role for user ${memberId} in group ${groupId}. Requested by: ${requesterId}`,
            context,
        );

        try {
            this.logger.debug(`Verifying permissions for requester: ${requesterId}`, context);
            const requester = await this.groupMemberRepository.findOne({
                where: { groupId, userId: requesterId },
            });

            if (!requester || (requester.role !== GroupRole.OWNER && requester.role !== GroupRole.ADMIN)) {
                this.logger.warn(
                    `Permission denied: User ${requesterId} attempted to change role but is not an Owner/Admin`,
                    context,
                );
                throw new ForbiddenException('You do not have permission to change roles in this group');
            }

            this.logger.debug(`Fetching target member record for user: ${memberId}`, context);
            const member = await this.groupMemberRepository.findOne({
                where: { groupId, userId: memberId },
            });

            if (!member) {
                this.logger.warn(
                    `Change role failed: Target user ${memberId} is not a member of group ${groupId}`,
                    context,
                );
                throw new NotFoundException(`Member not found in this group`);
            }

            if (member.role === GroupRole.OWNER && requester.role === GroupRole.ADMIN) {
                this.logger.warn(
                    `Security violation: Admin ${requesterId} tried to modify Owner ${memberId}'s role`,
                    context,
                );
                throw new ForbiddenException('Admins cannot change the role of the Owner');
            }

            const oldRole = member.role;
            member.role = newRole;

            this.logger.log(`Updating role in database from ${oldRole} to ${newRole}`, context);
            await this.groupMemberRepository.save(member);

            this.logger.log(`Successfully updated role for user ${memberId}. New role: ${newRole}`, context);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Unexpected error during role change: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Failed to change member role, please try again later.');
        }
    }

    /**
     * Retrieves the simplified group list for a given user ID.
     *
     * @param {string} userId - The ID of the user.
     * @return {Promise<GroupResponseDto[]>} - A promise that resolves to an array of GroupResponseDto objects representing the groups the user is a member of.
     */
    async getMyGroups(userId: string): Promise<GroupResponseDto[]> {
        const context = `${GroupsService.name}.getMyGroups`;
        this.logger.log(`Fetching simplified group list for user ID: ${userId}`, context);

        try {
            const groupMemberships = await this.groupMemberRepository.find({
                where: {
                    userId: userId,
                },
                relations: ['group'],
                order: {
                    group: {
                        createdAt: 'DESC',
                    },
                },
            });

            if (groupMemberships.length === 0) {
                this.logger.log(`User ${userId} is not a member of any group`, context);
                return [];
            }

            const result = groupMemberships.map(membership => {
                const g = membership.group;
                return {
                    id: g.id,
                    name: g.name,
                    description: g.description,
                    iconUrl: g.iconUrl,
                };
            });

            this.logger.log(`Successfully retrieved ${result.length} groups for user ID: ${userId}`, context);
            return mapToDto(GroupResponseDto, result);
        } catch (error) {
            this.logger.error(`Failed to get group list for user ${userId}: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Failed to retrieve groups.');
        }
    }

    /**
     * Retrieves the list of group members for a specific group.
     *
     * @param {string} groupId - The ID of the group.
     * @param {string} userId - The ID of the user.
     * @return {Promise<UserShortResponseDto[]>} - A promise that resolves to an array of UserShortResponseDto objects representing the group members.
     * @throws {ForbiddenException} - If the user is not a member of the group.
     * @throws {InternalServerErrorException} - If there was an error retrieving the group members.
     */
    async getGroupMembers(groupId: string, userId: string): Promise<UserShortResponseDto[]> {
        const context = `${GroupsService.name}.getGroupMembers`;
        this.logger.log(`User ${userId} attempting to fetch members for group: ${groupId}`, context);

        try {
            const isMember = await this.groupMemberRepository.findOne({
                where: {
                    groupId: groupId,
                    userId: userId,
                },
            });

            if (!isMember) {
                this.logger.warn(`Access denied: User ${userId} is not a member of group ${groupId}`, context);
                throw new ForbiddenException('You must be a member of this group to see the member list.');
            }

            const groupMembers = await this.groupMemberRepository.find({
                where: { groupId },
                relations: ['user'],
            });

            const users = groupMembers.map(member => member.user);

            this.logger.log(`Successfully retrieved ${users.length} members for group: ${groupId}`, context);
            return mapToDto(UserShortResponseDto, users);
        } catch (error) {
            if (error instanceof HttpException) throw error;

            this.logger.error(
                `Failed to get group members for group ID ${groupId}: ${(error as Error).message}`,
                context,
            );
            throw new InternalServerErrorException('Failed to retrieve group members.');
        }
    }
}
