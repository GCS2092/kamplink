import { IsString, IsOptional, IsUUID, IsIn } from 'class-validator';

export class CreateSignalementDto {
  @IsIn(['spam', 'inapproprie', 'harcelement', 'desinformation', 'autre'])
  raison!: 'spam' | 'inapproprie' | 'harcelement' | 'desinformation' | 'autre';

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsUUID()
  cibleUserId?: string;

  @IsOptional()
  @IsUUID()
  messageId?: string;

  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsUUID()
  opportuniteId?: string;
}
