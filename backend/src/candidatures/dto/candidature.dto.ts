import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ApplyDto {
  @IsOptional()
  @IsUrl()
  cvUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  lettreMotivation?: string;
}

export class SetStatutCandidatureDto {
  @IsIn(['vue', 'acceptee', 'refusee'])
  statut!: 'vue' | 'acceptee' | 'refusee';
}