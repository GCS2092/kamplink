import { IsString, IsOptional, IsIn, IsUrl, IsUUID } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsIn(['L1', 'L2', 'L3', 'M1', 'M2'])
  niveau?: 'L1' | 'L2' | 'L3' | 'M1' | 'M2';

  @IsOptional()
  @IsUUID()
  universiteId?: string;

  @IsOptional()
  @IsUUID()
  filiereId?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsUrl()
  cvUrl?: string;
}