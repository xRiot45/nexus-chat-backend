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
}
