import { IsString, IsOptional, IsUUID, IsIn, IsInt, IsBoolean } from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsUUID()
  canalId?: string;

  @IsString()
  titre!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['cours', 'exam', 'resume', 'exercice', 'autre'])
  typeFichier!: 'cours' | 'exam' | 'resume' | 'exercice' | 'autre';

  @IsString()
  urlFichier!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  tailleOctets!: number;

  @IsOptional()
  @IsBoolean()
  estPublic?: boolean;
}
