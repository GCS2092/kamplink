import { IsString, IsOptional, IsUUID, IsBoolean, IsIn, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  canalId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  contenu!: string;

  @IsIn(['annonce', 'question', 'ressource', 'discussion'])
  type!: 'annonce' | 'question' | 'ressource' | 'discussion';

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  estAnonyme?: boolean;
}
