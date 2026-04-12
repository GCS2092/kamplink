import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateEspaceDto {
  @IsString()
  nom!: string;

  @IsString()
  typeEspace!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  universiteId?: string;

  @IsOptional()
  @IsUUID()
  filiereId?: string;

  @IsOptional()
  @IsString()
  niveau?: string;

  @IsOptional()
  @IsBoolean()
  estPublic?: boolean;
}
