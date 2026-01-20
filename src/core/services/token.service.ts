import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { Socket } from 'socket.io';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { Repository } from 'typeorm';

interface Tokens {
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class TokenService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async generateTokens(userId: string, email: string): Promise<Tokens> {
        const basePayload = { sub: userId, email: email };

        const accessTokenExp = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '3600';
        const refreshTokenExp = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '604800';

        const accessTokenSecret = this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET');
        const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET');

        const [at, rt] = await Promise.all([
            // TODO : Generate Access Token
            this.jwtService.signAsync(
                { ...basePayload, type: 'access' },
                {
                    secret: accessTokenSecret,
                    expiresIn: parseInt(accessTokenExp, 10),
                },
            ),

            // TODO : Generate Refresh Token
            this.jwtService.signAsync(
                { ...basePayload, type: 'refresh' },
                {
                    secret: refreshTokenSecret,
                    expiresIn: parseInt(refreshTokenExp, 10),
                },
            ),
        ]);

        return {
            accessToken: at,
            refreshToken: rt,
        };
    }

    async updateRefreshTokenHash(userId: string, refreshToken: string): Promise<void> {
        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(refreshToken, salt);

        await this.userRepository.update(userId, {
            currentRefreshToken: hash,
        });
    }

    async removeRefreshToken(userId: string): Promise<void> {
        await this.userRepository.update(userId, {
            currentRefreshToken: null,
        });
    }

    async isRefreshTokenMatches(userId: string, refreshToken: string): Promise<boolean> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user || !user.currentRefreshToken) return false;

        return bcrypt.compare(refreshToken, user.currentRefreshToken);
    }

    extractToken(source: Request | Socket): string | null {
        //  (Standard HTTP/Postman)
        const headers = 'headers' in source ? source.headers : source.handshake.headers;
        const authHeader = headers?.authorization;

        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            return authHeader.split(' ')[1];
        }

        // (Standard Socket.io Client)
        if ('handshake' in source && source.handshake.auth?.token) {
            const authPayload = source.handshake.auth.token as string | string[];
            if (typeof authPayload === 'string') {
                return authPayload.startsWith('Bearer ') ? authPayload.split(' ')[1] : authPayload;
            }
        }

        // Query String (Fallback)
        const query = 'query' in source ? source.query : source.handshake.query;
        const token = query?.token;

        if (token && typeof token === 'string') {
            return token;
        }

        return null;
    }

    async verifyAccessToken(token: string): Promise<JwtPayload> {
        const secret = this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET');
        if (!secret) {
            throw new UnauthorizedException('Authentication token missing');
        }

        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
                secret: secret,
            });

            if (payload.type !== 'access') {
                throw new UnauthorizedException('Invalid token type');
            }

            return payload;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new UnauthorizedException(`Token verification failed: ${message}`);
        }
    }

    async authenticateSocket(client: Socket): Promise<JwtPayload> {
        const token = this.extractToken(client);
        if (!token) {
            throw new UnauthorizedException('Authentication token missing');
        }

        return this.verifyAccessToken(token);
    }
}
