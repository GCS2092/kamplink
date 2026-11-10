import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateEspaceDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  estPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  estActif?: boolean;
}
