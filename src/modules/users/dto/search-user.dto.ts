import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SearchUserDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3, { message: 'Pencarian minimal 3 karakter' })
    q: string;
}
