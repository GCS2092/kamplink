import { IsIn, IsUUID } from 'class-validator';

export class AddFavoriDto {
  @IsIn(['opportunite', 'message', 'document'])
  type!: 'opportunite' | 'message' | 'document';

  @IsUUID()
  ressourceId!: string;
}