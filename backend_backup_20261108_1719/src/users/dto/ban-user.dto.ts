import { IsString, IsNotEmpty } from 'class-validator';

export class BanUserDto {
  @IsString()
  @IsNotEmpty()
  raison!: string;
}
