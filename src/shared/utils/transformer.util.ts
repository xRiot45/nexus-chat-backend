import { ClassConstructor, plainToInstance } from 'class-transformer';

// Overload 1: If input is an Array, return Array
export function mapToDto<T, V>(cls: ClassConstructor<T>, data: V[]): T[];

// Overload 2: If input is a Single Object, return Single Object
export function mapToDto<T, V>(cls: ClassConstructor<T>, data: V): T;

// Implementation function
export function mapToDto<T, V>(cls: ClassConstructor<T>, data: V | V[]): T | T[] {
    if (!data) return data as T | T[];

    return plainToInstance(cls, data, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
    });
}
