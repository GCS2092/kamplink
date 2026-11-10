import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ListeRowDto {
  @IsString()
  @MaxLength(40)
  numeroCarte!: string;

  @IsString()
  @MaxLength(100)
  nom!: string;

  @IsString()
  @MaxLength(100)
  prenom!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  filiere?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  niveau?: string;
}

export class ImportListeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => ListeRowDto)
  rows!: ListeRowDto[];
}