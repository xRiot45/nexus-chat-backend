/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
    ConflictException,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { LoggerService } from 'src/core/logger/logger.service';
import { MailService } from 'src/core/mail/services/mail.service';
import { TokenService } from 'src/core/services/token.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UserEntity } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

jest.mock('bcrypt', () => ({
    genSalt: jest.fn(),
    hash: jest.fn(),
    compare: jest.fn(),
}));

describe('AuthService', () => {
    let service: AuthService;
    let userRepository;
    let jwtService;
    let configService;
    let mailService;

    // Mock Data
    const mockRegisterDto: RegisterDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
    };

    const mockUser = {
        id: 'uuid-123',
        ...mockRegisterDto,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockToken = 'mocked.jwt.token';
    const mockUserId = 'user-123';

    beforeEach(async () => {
        // Reset mocks sebelum setiap test
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                // Mock Repository
                {
                    provide: getRepositoryToken(UserEntity),
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                    },
                },
                // Mock JwtService
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn().mockReturnValue(mockToken),
                        verify: jest.fn(),
                    },
                },
                // Mock ConfigService
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'JWT_VERIFY_EMAIL_EXPIRES_IN') return '900';
                            if (key === 'JWT_VERIFY_EMAIL_SECRET') return 'secret';
                            if (key === 'APP_URL') return 'http://localhost:3000';
                            return null;
                        }),
                    },
                },
                // Mock MailService
                {
                    provide: MailService,
                    useValue: {
                        sendMail: jest.fn(),
                    },
                },
                // Mock Logger (supaya log tidak memenuhi console saat test)
                {
                    provide: LoggerService,
                    useValue: {
                        log: jest.fn(),
                        warn: jest.fn(),
                        debug: jest.fn(),
                        error: jest.fn(),
                    },
                },
                // Mock Token
                {
                    provide: TokenService,
                    useValue: {
                        generateAccessToken: jest.fn(),
                        generateRefreshToken: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        userRepository = module.get(getRepositoryToken(UserEntity));
        jwtService = module.get(JwtService);
        configService = module.get(ConfigService);
        mailService = module.get(MailService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('register', () => {
        it('should successfully register a user and return UserResponseDto', async () => {
            (userRepository.findOne as jest.Mock).mockResolvedValue(null);
            (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
            (userRepository.create as jest.Mock).mockReturnValue({
                ...mockUser,
                password: 'hashedPassword',
            });
            (userRepository.save as jest.Mock).mockResolvedValue({
                ...mockUser,
                password: 'hashedPassword',
            });
            (mailService.sendMail as jest.Mock).mockResolvedValue(true);

            const result = await service.register(mockRegisterDto);

            expect(userRepository.findOne).toHaveBeenCalledWith({
                where: [{ email: mockRegisterDto.email }, { username: mockRegisterDto.username }],
                select: ['id'],
            });
            expect(bcrypt.hash).toHaveBeenCalledWith(mockRegisterDto.password, 'salt');
            expect(userRepository.save).toHaveBeenCalled();
            expect(mailService.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: mockRegisterDto.email,
                    subject: 'Welcome to ChatApp! Please verify your email',
                }),
            );

            expect(result).toBeInstanceOf(UserResponseDto);
            expect(result.username).toEqual(mockRegisterDto.username);
        });

        it('should throw ConflictException if username or email already exists', async () => {
            (userRepository.findOne as jest.Mock).mockResolvedValue({ id: 'existing-id' });

            await expect(service.register(mockRegisterDto)).rejects.toThrow(ConflictException);

            expect(userRepository.create).not.toHaveBeenCalled();
            expect(userRepository.save).not.toHaveBeenCalled();
            expect(mailService.sendMail).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException if database save fails', async () => {
            (userRepository.findOne as jest.Mock).mockResolvedValue(null);
            (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
            (userRepository.create as jest.Mock).mockReturnValue(mockUser);
            (userRepository.save as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(service.register(mockRegisterDto)).rejects.toThrow(InternalServerErrorException);
        });

        it('should throw InternalServerErrorException if sending email fails', async () => {
            (userRepository.findOne as jest.Mock).mockResolvedValue(null);
            (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
            (userRepository.create as jest.Mock).mockReturnValue(mockUser);
            (userRepository.save as jest.Mock).mockResolvedValue(mockUser);
            (mailService.sendMail as jest.Mock).mockRejectedValue(new Error('SMTP Error'));

            await expect(service.register(mockRegisterDto)).rejects.toThrow(InternalServerErrorException);
        });
    });

    describe('verifyEmail', () => {
        const mockPayload = { sub: mockUserId, type: 'verify_email' };

        it('should successfully verify email', async () => {
            (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);
            (userRepository.findOne as jest.Mock).mockResolvedValue({
                id: mockUserId,
                email: 'test@example.com',
                isVerified: false,
            });
            (userRepository.update as jest.Mock).mockResolvedValue({
                affected: 1,
            });

            await service.verifyEmail(mockToken);

            expect(jwtService.verify).toHaveBeenCalledWith(mockToken, expect.any(Object));
            expect(userRepository.findOne).toHaveBeenCalledWith({
                where: { id: mockUserId },
                select: ['id', 'isVerified', 'email'],
            });
            expect(userRepository.update).toHaveBeenCalledWith(
                { id: mockUserId, isVerified: false },
                expect.objectContaining({ isVerified: true }),
            );
        });

        it('should throw UnauthorizedException if token is invalid or expired', async () => {
            (jwtService.verify as jest.Mock).mockImplementation(() => {
                throw new Error('Token expired');
            });

            await expect(service.verifyEmail(mockToken)).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException if token type is incorrect', async () => {
            (jwtService.verify as jest.Mock).mockReturnValue({ sub: mockUserId, type: 'wrong_type' });

            await expect(service.verifyEmail(mockToken)).rejects.toThrow(UnauthorizedException);
        });

        it('should throw NotFoundException if user is not found', async () => {
            (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);
            (userRepository.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.verifyEmail(mockToken)).rejects.toThrow(NotFoundException);
        });

        it('should simply return if user is already verified (idempotency)', async () => {
            (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);
            (userRepository.findOne as jest.Mock).mockResolvedValue({
                id: mockUserId,
                isVerified: true,
            });

            await service.verifyEmail(mockToken);

            expect(userRepository.update).not.toHaveBeenCalled();
        });

        it('should throw ConflictException if update fails (affected 0) and user is still not verified', async () => {
            (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);
            (userRepository.findOne as jest.Mock)
                .mockResolvedValueOnce({ id: mockUserId, isVerified: false })
                .mockResolvedValueOnce({ id: mockUserId, isVerified: false });

            (userRepository.update as jest.Mock).mockResolvedValue({ affected: 0 });

            await expect(service.verifyEmail(mockToken)).rejects.toThrow(ConflictException);
        });

        it('should return successfully if update fails but user was verified by another request', async () => {
            (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);
            (userRepository.findOne as jest.Mock)
                .mockResolvedValueOnce({ id: mockUserId, isVerified: false })
                .mockResolvedValueOnce({ id: mockUserId, isVerified: true });

            (userRepository.update as jest.Mock).mockResolvedValue({ affected: 0 });

            await expect(service.verifyEmail(mockToken)).resolves.toBeUndefined();
        });
    });
});
