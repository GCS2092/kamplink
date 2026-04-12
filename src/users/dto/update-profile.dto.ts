import { IsString, IsOptional, IsIn, IsUrl } from 'class-validator';

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
  @IsString()
  universiteId?: string;

  @IsOptional()
  @IsString()
  filiereId?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}