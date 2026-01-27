import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import fs from 'fs';
import { diskStorage, StorageEngine } from 'multer';
import path, { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
): void => {
    const isImage = file.mimetype.startsWith('image/') && file.originalname.match(/\.(jpg|jpeg|png|webp)$/i);
    const isVideo = file.mimetype.startsWith('video/') && file.originalname.match(/\.(mp4|mkv|mov)$/i);

    if (file.fieldname === 'video' && !isVideo) {
        return callback(new BadRequestException('Video format not supported! (Use mp4/mkv/mov)'), false);
    }

    if ((file.fieldname === 'image' || file.fieldname === 'avatar') && !isImage) {
        return callback(new BadRequestException('Image format not supported! (Use jpg/jpeg/png/webp)'), false);
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

export const createStorageConfig = (folderName: string): StorageEngine => {
    const uploadPath = `./public/uploads/${folderName}`;

    return diskStorage({
        destination: (req, file, cb) => {
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: editFileName,
    });
};

export const deleteFile = (relativeFilePath: string | null | undefined): void => {
    if (!relativeFilePath) return;

    const cleanPath = relativeFilePath.startsWith('/') ? relativeFilePath.substring(1) : relativeFilePath;
    const fullPath = path.join(process.cwd(), 'public', cleanPath);

    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
};
