import { IsString, Matches } from 'class-validator';

export class SubmitVerificationDto {
  // Reference rendue par POST /uploads/carte (pas d'URL libre)
  @IsString()
  @Matches(/^private:cartes\/[0-9a-f-]{36}_[0-9a-f-]{36}\.(jpg|png|webp)$/, {
    message: "Photo de carte invalide : téléversez-la d'abord via POST /uploads/carte",
  })
  photoCarteUrl!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9\-\s]{4,30}$/, {
    message: 'Numéro de carte invalide (4 à 30 caractères alphanumériques)',
  })
  numeroCarte!: string;
}