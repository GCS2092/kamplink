import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateEntrepriseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nom!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEmail()
  emailContact!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @IsOptional()
  @IsUrl()
  siteWeb?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  siret?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  documentVerif?: string;
}

export class UpdateEntrepriseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEmail()
  emailContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @IsOptional()
  @IsUrl()
  siteWeb?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  siret?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  documentVerif?: string;
}

export class EntrepriseDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  commentaireAdmin?: string;
}