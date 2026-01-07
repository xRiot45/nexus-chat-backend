import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from 'src/core/logger/logger.service';
import { Repository } from 'typeorm';
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
        const { recipientId, content } = dto;

        try {
            this.logger.log(`Processing message: ${senderId} -> ${recipientId}`, context);

            let conversation = await this.conversationRepository.findOne({
                where: [
                    { creatorId: senderId, recipientId: recipientId },
                    { creatorId: recipientId, recipientId: senderId },
                ],
            });

            if (!conversation) {
                this.logger.log(`Creating new conversation record`, context);
                conversation = await this.conversationRepository.save(
                    this.conversationRepository.create({
                        creatorId: senderId,
                        recipientId: recipientId,
                    }),
                );
            }

            const messageData = this.messageRepository.create({
                content,
                senderId,
                conversationId: conversation.id,
            });
            const savedMessage = await this.messageRepository.save(messageData);
            const fullMessage = await this.messageRepository.findOne({
                where: { id: savedMessage.id },
                relations: ['sender'],
            });

            if (!fullMessage) {
                throw new NotFoundException(`Message ${savedMessage.id} could not be retrieved`);
            }

            this.logger.log(`Message delivered successfully. ID: ${fullMessage.id}`, context);

            return new MessageResponseDto(fullMessage);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const stack = error instanceof Error ? error.stack : '';

            this.logger.error(`Failed to send message: ${errorMessage}`, stack, context);

            if (error instanceof NotFoundException) throw error;
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
}
