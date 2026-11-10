import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsInt,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  Min,
  Max,
} from 'class-validator';

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
  @Min(1)
  @Max(2147483647)
  tailleOctets!: number;

  @IsOptional()
  @IsBoolean()
  estPublic?: boolean;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @IsOptional()
  @IsIn(['public', 'restricted'])
  accessScope?: 'public' | 'restricted';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(['L1', 'L2', 'L3', 'M1', 'M2'], { each: true })
  allowedNiveaux?: ('L1' | 'L2' | 'L3' | 'M1' | 'M2')[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  allowedFiliereIds?: string[];
}