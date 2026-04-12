import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateMessageDto {
  @IsOptional()
  @IsString()
  contenu?: string;

  @IsOptional()
  @IsBoolean()
  estMasque?: boolean;
}
