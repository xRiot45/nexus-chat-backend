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
    async sendMessage(senderId: string, dto: CreateMessageDto): Promise<MessageResponseDto> {
        const context = `${ChatService.name}.sendMessage`;
        const { recipientId, groupId, content } = dto; // Ambil groupId dari DTO

        try {
            this.logger.log(`Processing message from ${senderId}`, context);

            let savedMessage: MessageEntity;

            // --- SKENARIO 1: GROUP CHAT ---
            if (groupId) {
                this.logger.log(`Target: Group ${groupId}`, context);

                // 1. Validasi: Apakah pengirim adalah anggota grup?
                const isMember = await this.groupMemberRepository.findOne({
                    where: { groupId, userId: senderId },
                });

                if (!isMember) {
                    this.logger.warn(
                        `User ${senderId} tried to send message to group ${groupId} without membership`,
                        context,
                    );
                    throw new ForbiddenException('You are not a member of this group');
                }

                // 2. Buat object pesan untuk Group
                const messageData = this.messageRepository.create({
                    content,
                    senderId,
                    groupId, // Set Group ID
                    conversationId: null, // Pastikan conversationId null
                    isRead: false, // Read receipt untuk grup biasanya logic-nya beda, default false
                });

                savedMessage = await this.messageRepository.save(messageData);
            }

            // --- SKENARIO 2: 1-ON-1 CHAT ---
            else if (recipientId) {
                this.logger.log(`Target: User ${recipientId}`, context);

                // 1. Cari Conversation yang sudah ada
                let conversation = await this.conversationRepository.findOne({
                    where: [
                        { creatorId: senderId, recipientId: recipientId },
                        { creatorId: recipientId, recipientId: senderId },
                    ],
                });

                // 2. Jika tidak ada, buat baru
                if (!conversation) {
                    this.logger.log(`Creating new 1-on-1 conversation`, context);
                    conversation = await this.conversationRepository.save(
                        this.conversationRepository.create({
                            creatorId: senderId,
                            recipientId: recipientId,
                        }),
                    );
                }

                // 3. Buat object pesan untuk Conversation
                const messageData = this.messageRepository.create({
                    content,
                    senderId,
                    conversationId: conversation.id, // Set Conversation ID
                    groupId: null, // Pastikan groupId null
                });

                savedMessage = await this.messageRepository.save(messageData);
            } else {
                throw new BadRequestException('Message must have either a groupId or a recipientId');
            }

            // --- FINAL: RETRIEVE FULL DATA ---
            // Kita perlu fetch ulang untuk mendapatkan relasi sender (avatar, name, dll)
            const fullMessage = await this.messageRepository.findOne({
                where: { id: savedMessage.id },
                relations: ['sender'],
            });

            if (!fullMessage) {
                throw new NotFoundException(`Message ${savedMessage.id} could not be retrieved`);
            }

            this.logger.log(`Message delivered. ID: ${fullMessage.id}`, context);

            return new MessageResponseDto(fullMessage);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : '';

            this.logger.error(`Failed to send message: ${errorMessage}`, stack, context);

            // Re-throw exception yang sudah kita tangani
            if (
                error instanceof ForbiddenException ||
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }

            throw new InternalServerErrorException('Chat service encountered an error');
        }
    }

    /**
     * Retrieves a list of messages for a given user and recipient pair.
     * If the conversation does not exist, an empty array is returned.
     * The messages are ordered in descending order by their creation time and are paginated.
     * @param userId The ID of the user to retrieve the messages for.
     * @param recipientId The ID of the recipient to retrieve the messages for.
     * @param limit The maximum number of messages to return. Defaults to 20.
     * @param offset The number of messages to skip before returning the result. Defaults to 0.
     * @returns A promise of the MessageResponseDto array containing the messages.
     * @throws InternalServerErrorException If an unexpected error occurs during the retrieval of the messages.
     */
    async getMessages(
        userId: string,
        recipientId: string,
        limit: number = 20,
        offset: number = 0,
    ): Promise<MessageResponseDto[]> {
        const context = `${ChatService.name}.getMessages`;

        try {
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
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch messages: ${errorMessage}`, (error as Error).stack, context);
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
