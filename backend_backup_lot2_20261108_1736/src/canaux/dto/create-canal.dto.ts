import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateCanalDto {
  @IsUUID()
  espaceId!: string;

  @IsString()
  nom!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  estPublic?: boolean;
}
