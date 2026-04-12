import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateCanalDto {
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
