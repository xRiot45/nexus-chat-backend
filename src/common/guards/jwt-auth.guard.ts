import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { TokenService } from 'src/core/services/token.service';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly tokenService: TokenService,
        private readonly configService: ConfigService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.tokenService.extractToken(request);
        const secret = this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET');

        if (!token) {
            throw new UnauthorizedException('Authentication token missing');
        }

        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
                secret: secret,
            });

            request.user = payload;
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }

        return true;
    }
}
