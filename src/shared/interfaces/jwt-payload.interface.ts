export interface JwtPayload {
    sub: string;
    username: string;
    email?: string;
    type?: string;
    iat?: number;
    exp?: number;
}
