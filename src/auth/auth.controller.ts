import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Étape 1 : Le mobile a vérifié l'OTP avec Firebase
  // Il envoie l'idToken ici pour créer/récupérer son compte
  @Post('login')
  async login(@Body() body: { idToken: string }) {
    return this.authService.loginWithFirebaseToken(body.idToken);
  }

  // Étape 2 : Compléter le profil académique (route protégée)
  @Post('profile')
  @UseGuards(AuthGuard)
  async createProfil(@Request() req, @Body() body: {
    prenom: string;
    nom: string;
    niveau: string;
    universiteId: string;
    filiereId: string;
  }) {
    return this.authService.createProfil(req.user.id, body);
  }
}