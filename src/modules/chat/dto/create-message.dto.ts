import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMessageDto {
    @ApiProperty({
        description: 'ID (UUID) dari user yang akan menerima pesan. (Opsional jika Group Chat)',
        example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        required: false,
    })
    @IsOptional()
    @IsUUID('4', { message: 'Recipient ID harus format UUID yang valid' })
    recipientId?: string;

    @ApiProperty({
        description: 'ID (UUID) dari group yang akan menerima pesan. (Opsional jika Personal Chat)',
        example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        required: false,
    })
    @IsOptional()
    @IsUUID('4', { message: 'Group ID harus format UUID yang valid' })
    groupId?: string;

    @ApiProperty({
        description: 'Isi pesan teks yang akan dikirim',
        example: 'Halo, apa kabar?',
        maxLength: 5000,
    })
    @IsNotEmpty({ message: 'Konten pesan tidak boleh kosong' })
    @IsString()
    @MaxLength(5000, { message: 'Pesan terlalu panjang (maksimal 5000 karakter)' })
    content: string;
}
