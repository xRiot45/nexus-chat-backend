/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ConflictException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;

    // Mock Data
    const mockRegisterDto: RegisterDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: {
                        register: jest.fn(),
                        verifyEmail: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'APP_URL') return 'http://localhost:3000';
                            if (key === 'FRONTEND_URL') return 'http://localhost:3001';
                            return null;
                        }),
                    },
                },
            ],
        })
            // .overrideGuard(ThrottlerGuard)
            // .useValue({ canActivate: jest.fn(() => true) })

            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })

            .compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('register', () => {
        it('should register a new user and return success response', async () => {
            (authService.register as jest.Mock).mockResolvedValue({
                id: 'user-id-123',
                username: mockRegisterDto.username,
                email: mockRegisterDto.email,
                fullName: mockRegisterDto.fullName,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const result = await controller.register(mockRegisterDto);
            expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);

            expect(result).toEqual({
                success: true,
                statusCode: HttpStatus.CREATED,
                timestamp: expect.any(Date),
                message: 'Registration successful. Please check your email to verify your account.',
            });
        });

        it('should propagate errors from AuthService', async () => {
            const error = new Error('Email already exists');
            (authService.register as jest.Mock).mockRejectedValue(error);

            await expect(controller.register(mockRegisterDto)).rejects.toThrow(error);
        });
    });

    describe('verifyEmail', () => {
        const mockResponse = {
            redirect: jest.fn(),
        } as unknown as Response;

        const mockToken = 'valid-token';
        const frontendUrl = 'http://localhost:3001';

        it('should redirect to success page when verification is successful', async () => {
            (authService.verifyEmail as jest.Mock).mockResolvedValue(undefined);

            await controller.verifyEmail(mockToken, mockResponse);

            expect(authService.verifyEmail).toHaveBeenCalledWith(mockToken);
            expect(mockResponse.redirect).toHaveBeenCalledWith(`${frontendUrl}/verify-email?status=success`);
        });

        it('should redirect with INVALID_TOKEN error code when UnauthorizedException occurs', async () => {
            (authService.verifyEmail as jest.Mock).mockRejectedValue(new UnauthorizedException('Invalid token'));

            await controller.verifyEmail(mockToken, mockResponse);

            expect(mockResponse.redirect).toHaveBeenCalledWith(
                `${frontendUrl}/verify-email?status=failed&code=INVALID_TOKEN`,
            );
        });

        it('should redirect with ALREADY_VERIFIED error code when ConflictException occurs', async () => {
            (authService.verifyEmail as jest.Mock).mockRejectedValue(new ConflictException('User already verified'));

            await controller.verifyEmail(mockToken, mockResponse);

            expect(mockResponse.redirect).toHaveBeenCalledWith(
                `${frontendUrl}/verify-email?status=failed&code=ALREADY_VERIFIED`,
            );
        });

        it('should redirect with UNKNOWN_ERROR code for other unexpected errors', async () => {
            (authService.verifyEmail as jest.Mock).mockRejectedValue(new Error('Database exploded'));

            await controller.verifyEmail(mockToken, mockResponse);

            expect(mockResponse.redirect).toHaveBeenCalledWith(
                `${frontendUrl}/verify-email?status=failed&code=UNKNOWN_ERROR`,
            );
        });
    });
});
