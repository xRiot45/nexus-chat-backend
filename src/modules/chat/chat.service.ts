import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { LoggerService } from 'src/core/logger/logger.service';
import { Not, Repository } from 'typeorm';
import { GroupMemberEntity } from '../groups/entities/group-member.entity';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';
import { GetMessageParams } from './interfaces/get-message-params.interface';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(ConversationEntity)
        private readonly conversationRepository: Repository<ConversationEntity>,
        @InjectRepository(MessageEntity)
        private readonly messageRepository: Repository<MessageEntity>,
        @InjectRepository(GroupMemberEntity)
        private readonly groupMemberRepository: Repository<GroupMemberEntity>,
        private readonly logger: LoggerService,
    ) {}

    /**
     * Sends a message from the sender to the recipient.
     * If the conversation between the sender and recipient does not exist, a new conversation record is created.
     * The message is then saved to the database and the full message object is returned.
     * If the message could not be retrieved after saving, a NotFoundException is thrown.
     * If any other unexpected error occurs during the sending of the message, an InternalServerErrorException is thrown.
     * @param senderId The ID of the user sending the message.
     * @param dto The CreateMessageDto containing the recipient ID and message content.
     * @returns A promise of the MessageResponseDto containing the full message object.
     * @throws NotFoundException If the message could not be retrieved after saving.
     * @throws InternalServerErrorException If any other unexpected error occurs during the sending of the message.
     */
    async sendMessage(senderId: string, dto: CreateMessageDto): Promise<MessageEntity> {
        const context = `${ChatService.name}.sendMessage`;
        const { recipientId, groupId, content } = dto;

        try {
            this.logger.log(`Processing message from ${senderId}`, context);

            let savedMessage: MessageEntity;

            if (groupId) {
                this.logger.log(`Target: Group ${groupId}`, context);
                const isMember = await this.groupMemberRepository.findOne({
                    where: { groupId, userId: senderId },
                });

                if (!isMember) {
                    this.logger.warn(`User ${senderId} not member of group ${groupId}`, context);
                    throw new ForbiddenException('You are not a member of this group');
                }

                const messageData = this.messageRepository.create({
                    content,
                    senderId,
                    groupId,
                    conversationId: null,
                    isRead: false,
                });

                savedMessage = await this.messageRepository.save(messageData);
            } else if (recipientId) {
                this.logger.log(`Target: User ${recipientId}`, context);
                let conversation = await this.conversationRepository.findOne({
                    where: [
                        { creatorId: senderId, recipientId: recipientId },
                        { creatorId: recipientId, recipientId: senderId },
                    ],
                });

                if (!conversation) {
                    this.logger.log(`Creating new conversation`, context);
                    conversation = await this.conversationRepository.save(
                        this.conversationRepository.create({
                            creatorId: senderId,
                            recipientId: recipientId,
                        }),
                    );
                }

                // 2. Simpan Pesan Personal
                const messageData = this.messageRepository.create({
                    content,
                    senderId,
                    conversationId: conversation.id,
                    groupId: null,
                });

                savedMessage = await this.messageRepository.save(messageData);
            } else {
                throw new BadRequestException('Message must have either groupId or recipientId');
            }

            const fullMessage = await this.messageRepository.findOne({
                where: { id: savedMessage.id },
                relations: ['sender'],
            });

            if (!fullMessage) {
                throw new NotFoundException('Failed to retrieve saved message');
            }

            return fullMessage;
        } catch (error) {
            this.logger.error(`SendMessage Error: ${(error as Error).message}`, (error as Error).stack, context);
            if (
                error instanceof ForbiddenException ||
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }
            throw new InternalServerErrorException('Chat service error');
        }
    }

    /**
     * Retrieves a list of messages for a given user ID, recipient ID, and/or group ID.
     * The list is ordered chronologically with the most recent message first.
     * The limit parameter specifies the maximum number of messages to retrieve (default: 20).
     * The offset parameter specifies the number of messages to skip before returning the list (default: 0).
     * If the recipient ID is provided, the messages will be from a personal conversation with the recipient.
     * If the group ID is provided, the messages will be from a group conversation.
     * If neither the recipient ID nor the group ID is provided, a BadRequestException will be thrown.
     * If the user is not a member of the group, a ForbiddenException will be thrown.
     * @param {string} userId - The ID of the user whose messages are being retrieved.
     * @param {string} [recipientId] - The ID of the recipient whose messages are being retrieved.
     * @param {string} [groupId] - The ID of the group whose messages are being retrieved.
     * @param {number} [limit=20] - The maximum number of messages to retrieve.
     * @param {number} [offset=0] - The number of messages to skip before returning the list.
     * @return {Promise<MessageResponseDto[]>} - A promise that resolves to an array of MessageResponseDto objects representing the list of messages.
     * @throws {ForbiddenException} - If the user is not a member of the group.
     * @throws {BadRequestException} - If neither the recipient ID nor the group ID is provided.
     * @throws {InternalServerErrorException} - If an unexpected error occurs during the retrieval of the messages.
     */
    async getMessages(params: GetMessageParams): Promise<MessageResponseDto[]> {
        const { userId, recipientId, groupId, limit = 20, offset = 0 } = params;
        const context = `${ChatService.name}.getMessages`;

        try {
            if (groupId) {
                const isMember = await this.groupMemberRepository.findOne({
                    where: { groupId, userId },
                });

                if (!isMember) {
                    this.logger.warn(
                        `User ${userId} tried to fetch messages for group ${groupId} without membership`,
                        context,
                    );
                    throw new ForbiddenException('You are not a member of this group');
                }

                const messages = await this.messageRepository.find({
                    where: { groupId },
                    relations: ['sender'],
                    order: { createdAt: 'DESC' },
                    take: limit,
                    skip: offset,
                });

                return messages.map(message => new MessageResponseDto(message));
            } else if (recipientId) {
                const conversation = await this.conversationRepository.findOne({
                    where: [
                        { creatorId: userId, recipientId: recipientId },
                        { creatorId: recipientId, recipientId: userId },
                    ],
                });

                if (!conversation) return [];
                const messages = await this.messageRepository.find({
                    where: { conversationId: conversation.id },
                    relations: ['sender'],
                    order: { createdAt: 'DESC' },
                    take: limit,
                    skip: offset,
                });

                return messages.map(message => new MessageResponseDto(message));
            } else {
                throw new BadRequestException('You must provide either recipientId or groupId');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch messages: ${errorMessage}`, (error as Error).stack, context);

            if (error instanceof ForbiddenException || error instanceof BadRequestException) {
                throw error;
            }

            throw new InternalServerErrorException('Could not retrieve chat history');
        }
    }

    /**
     * Retrieves a comprehensive list of chat conversations for a specific user,
     * including the participants' profiles and the single most recent message
     * for each conversation to populate the "Recent Messages" sidebar/list.
     * * Key operations:
     * 1. Filters conversations where the user is either the creator or the recipient.
     * 2. Performs a left join with a subquery to fetch only the latest message per conversation.
     * 3. Orders the entire list chronologically based on the last message's timestamp (Newest first).
     *
     * @param {string} userId - The unique identifier of the user whose conversation history is being retrieved.
     * @return {Promise<ConversationResponseDto[]>} A promise that resolves to an array of DTOs containing
     * conversation metadata, participant info, and the latest message snippet.
     * @throws {InternalServerErrorException} If a database connection error or an unexpected query failure occurs.
     */
    async getUserRecentConversationsWithLastMessage(userId: string): Promise<ConversationResponseDto[]> {
        const context = `${ChatService.name}.getUserRecentConversationsWithLastMessage`;

        try {
            this.logger.log(`Initiating retrieval of recent conversations for user ID: ${userId}`, context);

            const conversations = await this.conversationRepository
                .createQueryBuilder('conversation')
                .leftJoinAndSelect('conversation.creator', 'creator')
                .leftJoinAndSelect('conversation.recipient', 'recipient')
                .leftJoinAndSelect(
                    'conversation.messages',
                    'messages',
                    'messages.id = (SELECT m.id FROM messages m WHERE m.conversationId = conversation.id ORDER BY m.createdAt DESC LIMIT 1)',
                )
                .where('conversation.creatorId = :userId OR conversation.recipientId = :userId', { userId })
                .orderBy('messages.createdAt', 'DESC')
                .getMany();

            this.logger.log(
                `Successfully retrieved ${conversations.length} active conversations for user: ${userId}`,
                context,
            );

            return plainToInstance(ConversationResponseDto, conversations, {
                excludeExtraneousValues: true,
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(
                `Critical failure in getUserRecentConversationsWithLastMessage: ${errorMessage}`,
                (error as Error).stack,
                context,
            );

            throw new InternalServerErrorException('An unexpected error occurred while fetching your chat list');
        }
    }

    /**
     * Marks a conversation as read by the given user.
     * The last message sent by the other user in the conversation will be marked as read.
     * The ID of the last message will be returned, or null if no message was marked as read.
     * @param {string} userId - The ID of the user marking the conversation as read.
     * @param {string} conversationId - The ID of the conversation to mark as read.
     * @returns {Promise<string | null>} A promise that resolves to the ID of the last message marked as read, or null if no message was marked as read.
     * @throws {InternalServerErrorException} If an unexpected error occurs during the marking of the conversation as read.
     */
    async markConversationAsRead(userId: string, conversationId: string): Promise<string | null> {
        const context = `${ChatService.name}.markConversationAsRead`;

        try {
            await this.messageRepository.update(
                {
                    conversationId,
                    senderId: Not(userId),
                    isRead: false,
                },
                {
                    isRead: true,
                    readAt: new Date(),
                },
            );

            const lastMessage = await this.messageRepository.findOne({
                where: { conversationId, senderId: Not(userId) },
                order: { createdAt: 'DESC' },
            });

            return lastMessage?.id ?? null;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to mark conversation as read: ${message}`, (error as Error).stack, context);
            throw new InternalServerErrorException('Could not mark conversation as read');
        }
    }
}
