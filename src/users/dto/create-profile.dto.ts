import { IsString, IsIn } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  prenom!: string;

  @IsString()
  nom!: string;

  @IsIn(['L1', 'L2', 'L3', 'M1', 'M2'])
  niveau!: 'L1' | 'L2' | 'L3' | 'M1' | 'M2';

  @IsString()
  universiteId!: string;

  @IsString()
  filiereId!: string;
}