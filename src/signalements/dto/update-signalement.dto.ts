import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateSignalementDto {
  @IsOptional()
  @IsIn(['ouvert', 'en_cours', 'resolu', 'classe'])
  statut?: 'ouvert' | 'en_cours' | 'resolu' | 'classe';

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
