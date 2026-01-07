import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedSocket } from 'src/modules/chat/chat.gateway';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator((data: unknown, context: ExecutionContext): JwtPayload => {
    const type = context.getType();

    if (type === 'http') {
        const request = context.switchToHttp().getRequest<Request>();
        if (!request.user) {
            throw new InternalServerErrorException('User not found in Request. Make sure JwtAuthGuard is applied.');
        }

        return request.user as JwtPayload;
    }

    if (type === 'ws') {
        const client = context.switchToWs().getClient<AuthenticatedSocket>();
        if (!client.data.user) {
            throw new InternalServerErrorException('User not found in Socket. Make sure JwtAuthGuard is applied.');
        }

        return client.data.user;
    }

    throw new InternalServerErrorException(`Unsupported context type: ${type}`);
});
