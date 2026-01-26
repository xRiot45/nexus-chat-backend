import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import fs from 'fs';
import { diskStorage } from 'multer';
import path, { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const imageFileFilter = (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
): void => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
        return callback(new BadRequestException('Only image files (jpg, jpeg, png, webp) are allowed!'), false);
    }
    callback(null, true);
};

export const editFileName = (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, filename: string) => void,
): void => {
    const fileExtName = extname(file.originalname);
    const randomName = uuidv4();
    callback(null, `${randomName}${fileExtName}`);
};

export const storageConfig = diskStorage({
    destination: './public/uploads/avatars',
    filename: editFileName,
});

export const deleteOldAvatar = (avatarUrl: string): void => {
    const filePath = path.join(process.cwd(), 'public', avatarUrl);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};
