import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiDocGenericResponse } from 'src/common/decorators/api-doc.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { BaseResponseDto } from 'src/shared/dto/base-response.dto';
import type { AuthenticatedRequest } from 'src/shared/interfaces/authenticated-request.interface';
import { ContactsService } from './contacts.service';
import { ContactResponseDto } from './dto/contact.dto';
import { CreateContactDto } from './dto/create-contact.dto';

@ApiTags('Contacts')
// @UseGuards(ThrottlerGuard)
@Controller('contacts')
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) {}

    @ApiDocGenericResponse({
        summary: 'Create contact',
        description: 'Contact created successfully',
        status: HttpStatus.CREATED,
        body: CreateContactDto,
        auth: true,
    })
    // @Throttle({ default: { limit: 5, ttl: 60 } })
    @UseGuards(JwtAuthGuard)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() createContactDto: CreateContactDto,
        @Req() req: AuthenticatedRequest,
    ): Promise<BaseResponseDto<ContactResponseDto>> {
        const userId = req?.user?.sub;
        const data = await this.contactsService.create(createContactDto, userId);
        return {
            success: true,
            statusCode: HttpStatus.CREATED,
            timestamp: new Date(),
            message: 'Contact created successfully',
            data,
        };
    }
}
