import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateEspaceDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsBoolean()
  estPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  estActif?: boolean;
}
