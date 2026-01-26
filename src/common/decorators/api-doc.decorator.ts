/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiResponseOptions } from '@nestjs/swagger';

interface ApiDocOptions {
    summary: string;
    description?: string;
    body?: Type<unknown>;
    response?: Type<unknown>;
    status?: HttpStatus;
    auth?: boolean;
    isMultipart?: boolean;
    extraResponses?: ApiResponseOptions[];
}

export function ApiDocGenericResponse(
    options: ApiDocOptions,
): <TFunction extends Function, Y>(
    target: object | TFunction,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<Y>,
) => void {
    const {
        summary,
        description,
        body,
        response,
        status = HttpStatus.OK,
        auth = false,
        isMultipart = false,
        extraResponses = [],
    } = options;

    const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [
        ApiOperation({ summary, description }),

        ApiResponse({
            status: status,
            description: 'Operation successful',
            type: response,
        }),

        ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed or malformed request' }),
        ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' }),
        ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' }),
    ];

    // Handle Authentication
    if (auth) {
        decorators.push(
            ApiBearerAuth(),
            ApiResponse({
                status: HttpStatus.UNAUTHORIZED,
                description: 'Unauthorized: Access token is missing or invalid',
            }),
            ApiResponse({
                status: HttpStatus.FORBIDDEN,
                description: 'Forbidden: You do not have permission to access this resource',
            }),
        );
    }

    // Handle Multipart / File Upload
    if (isMultipart) {
        decorators.push(ApiConsumes('multipart/form-data'));
    }

    // Handle Request Body
    if (body) {
        decorators.push(ApiBody({ type: body }));
    }

    // Handle Extra Responses
    if (extraResponses.length > 0) {
        extraResponses.forEach(res => decorators.push(ApiResponse(res)));
    }

    return applyDecorators(...decorators);
}
