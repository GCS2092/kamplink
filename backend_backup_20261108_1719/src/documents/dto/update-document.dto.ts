import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  estPublic?: boolean;
}
