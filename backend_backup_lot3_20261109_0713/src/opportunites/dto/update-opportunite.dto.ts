import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class UpdateOpportuniteDto {
  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  entreprise?: string;

  @IsOptional()
  @IsIn(['stage', 'emploi', 'bourse', 'concours', 'evenement'])
  typeOffre?: 'stage' | 'emploi' | 'bourse' | 'concours' | 'evenement';

  @IsOptional()
  @IsString()
  domaine?: string;

  @IsOptional()
  @IsIn(['L1', 'L2', 'L3', 'M1', 'M2', 'tous'])
  niveauRequis?: 'L1' | 'L2' | 'L3' | 'M1' | 'M2' | 'tous';

  @IsOptional()
  @IsDateString()
  dateLimite?: string;

  @IsOptional()
  @IsString()
  localisation?: string;

  @IsOptional()
  @IsString()
  urlExterne?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
