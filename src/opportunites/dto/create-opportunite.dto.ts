import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateOpportuniteDto {
  @IsString()
  titre!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  entreprise?: string;

  @IsIn(['stage', 'emploi', 'bourse', 'concours', 'evenement'])
  typeOffre!: 'stage' | 'emploi' | 'bourse' | 'concours' | 'evenement';

  @IsOptional()
  @IsString()
  domaine?: string;

  @IsIn(['L1', 'L2', 'L3', 'M1', 'M2', 'tous'])
  niveauRequis!: 'L1' | 'L2' | 'L3' | 'M1' | 'M2' | 'tous';

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
