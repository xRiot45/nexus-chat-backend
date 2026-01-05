import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
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
    @Post()
    @UseGuards(JwtAuthGuard)
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

    @ApiDocGenericResponse({
        summary: 'Get all contacts',
        description: 'Contacts fetched successfully',
        status: HttpStatus.OK,
        response: ContactResponseDto,
        auth: true,
    })
    @Get()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async findAll(@Req() req: AuthenticatedRequest): Promise<BaseResponseDto<ContactResponseDto[]>> {
        const userId = req?.user?.sub;
        const data = await this.contactsService.findAll(userId);
        return {
            success: true,
            statusCode: HttpStatus.OK,
            timestamp: new Date(),
            message: 'Contacts fetched successfully',
            data,
        };
    }

    @ApiDocGenericResponse({
        summary: 'Get contact by id',
        description: 'Contact fetched by ID successfully',
        status: HttpStatus.OK,
        response: ContactResponseDto,
        auth: true,
    })
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async findById(
        @Param('id') id: string,
        @Req() req: AuthenticatedRequest,
    ): Promise<BaseResponseDto<ContactResponseDto>> {
        const userId = req?.user?.sub;
        const data = await this.contactsService.findById(id, userId);
        return {
            success: true,
            statusCode: HttpStatus.OK,
            timestamp: new Date(),
            message: 'Contact fetched by ID successfully',
            data,
        };
    }
}
