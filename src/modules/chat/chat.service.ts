import { Injectable, InternalServerErrorException } from '@nestjs/common';
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

    async sendMessage(senderId: string, createMessageDto: CreateMessageDto): Promise<MessageResponseDto> {
        const context = `${ChatService.name}.sendMessage`;
        const { recipientId, content } = createMessageDto;

        this.logger.log(`Sending message from ${senderId} to ${recipientId}`, context);

        let conversation = await this.conversationRepository.findOne({
            where: [
                { creatorId: senderId, recipientId: recipientId },
                { creatorId: recipientId, recipientId: senderId },
            ],
        });

        if (!conversation) {
            this.logger.log(`Creating new conversation between ${senderId} and ${recipientId}`, context);
            conversation = this.conversationRepository.create({
                creatorId: senderId,
                recipientId: recipientId,
            });

            await this.conversationRepository.save(conversation);
        }

        try {
            const message = this.messageRepository.create({
                content: content,
                senderId: senderId,
                conversationId: conversation.id,
            });

            const savedMessage = await this.messageRepository.save(message);
            const fullMessage = await this.messageRepository.findOne({
                where: { id: savedMessage.id },
                relations: ['sender'],
            });

            if (!fullMessage) {
                this.logger.error('Failed to send message', context);
                throw new InternalServerErrorException('Failed to send message');
            }

            return new MessageResponseDto(fullMessage);
        } catch (error) {
            this.logger.error(`Failed to send message: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Failed to send message');
        }
    }
}
