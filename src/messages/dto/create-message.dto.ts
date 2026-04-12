import { IsString, IsOptional, IsUUID, IsBoolean, IsIn } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  canalId!: string;

  @IsString()
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
