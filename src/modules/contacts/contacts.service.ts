import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { LoggerService } from 'src/core/logger/logger.service';
import { Repository } from 'typeorm';
import { ContactResponseDto } from './dto/contact.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactEntity } from './entities/contact.entity';

@Injectable()
export class ContactsService {
    constructor(
        @InjectRepository(ContactEntity)
        private readonly contactRepository: Repository<ContactEntity>,
        private readonly logger: LoggerService,
    ) {}

    /**
     * Create a new contact in the user's contact list.
     * @param createContactDto The request data transfer object containing the contact user ID and alias.
     * @param userId The ID of the user creating the contact.
     * @returns A promise of the ContactResponseDto containing the newly created contact.
     * @throws BadRequestException If the user tries to add themselves as a contact.
     * @throws ConflictException If the contact already exists in the user's contact list.
     * @throws InternalServerErrorException If an unexpected error occurs during the creation of the contact.
     */
    async create(createContactDto: CreateContactDto, userId: string): Promise<ContactResponseDto> {
        const context = `${ContactsService.name}.create`;
        const { contactUserId, alias } = createContactDto;

        if (userId === contactUserId) {
            throw new BadRequestException('You cannot add yourself as a contact');
        }

        this.logger.log(`User ${userId} is adding ${contactUserId} as contact`, context);

        const existingContact = await this.contactRepository.findOne({
            where: {
                userId: userId,
                contactUserId: contactUserId,
            },
        });

        if (existingContact) {
            this.logger.warn(`Contact ${contactUserId} already exists for user ${userId}`, context);
            throw new ConflictException('Contact already exists in your list');
        }

        try {
            const newContact = this.contactRepository.create({
                userId,
                contactUserId,
                alias,
            });

            const savedContact = await this.contactRepository.save(newContact);
            const fullContact = await this.contactRepository.findOne({
                where: { id: savedContact.id },
                relations: ['contactUser'],
            });

            return plainToInstance(ContactResponseDto, fullContact, {
                excludeExtraneousValues: true,
            });
        } catch (error) {
            this.logger.error(`Failed to create contact: ${(error as Error).message}`, context);
            throw new InternalServerErrorException('Failed to create contact');
        }
    }
}
