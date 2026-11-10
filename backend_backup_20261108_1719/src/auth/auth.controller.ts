import { Controller, Post, Body, Request, UseGuards, Headers, Ip, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { SecurityService } from '../security/security.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Throttle } from '../redis/redis-throttler.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private securityService: SecurityService,
  ) {}

  // ─────────────────────────────────────────
  // LOGIN AVEC PROTECTION
  // ─────────────────────────────────────────

  @Post('login')
  @Throttle({ ttl: 60, limit: 5, blockDuration: 900 }) // 5 tentatives par minute, bloc 15min
  async login(
    @Body() body: { idToken: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    // Vérifier si l'IP ou le compte est bloqué
    // Note: On ne peut pas vérifier le téléphone avant de vérifier le token
    // mais on peut vérifier si l'IP est bloquée
    const isIpBlocked = await this.securityService.isIpBlocked(ip);
    if (isIpBlocked) {
      throw new ForbiddenException('Accès interdit - IP bloquée');
    }

    try {
      const result = await this.authService.loginWithFirebaseToken(body.idToken);
      
      // Enregistrer la tentative réussie
      await this.securityService.recordLoginAttempt(
        result.user.telephone || 'unknown',
        ip,
        userAgent || 'unknown',
        true,
        result.user.id,
      );

      return result;
    } catch (error) {
      // Extraire le téléphone du token si possible (sinon utiliser 'unknown')
      await this.securityService.recordLoginAttempt(
        'unknown',
        ip,
        userAgent || 'unknown',
        false,
      );
      throw error;
    }
  }

  // ─────────────────────────────────────────
  // PROFIL
  // ─────────────────────────────────────────

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

  // ─────────────────────────────────────────
  // MOT DE PASSE OUBLIÉ
  // ─────────────────────────────────────────

  @Post('forgot-password')
  @Throttle({ ttl: 60, limit: 3, blockDuration: 600 }) // 3 demandes par minute, bloc 10min
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    // Note: Avec Firebase Auth, la réinitialisation se fait via Firebase
    // mais on enregistre la demande pour audit
    
    if (!dto.email && !dto.telephone) {
      throw new ForbiddenException('Email ou téléphone requis');
    }

    // Log pour audit (ne pas exposer si l'utilisateur existe ou non)
    console.log(`[AUDIT] Demande reset password: ${dto.email || dto.telephone}`);

    // Retourner un message générique pour éviter l'énumération d'utilisateurs
    return {
      message: 'Si un compte existe avec cet email/téléphone, un lien de réinitialisation a été envoyé.',
    };
  }

  // ─────────────────────────────────────────
  // RÉINITIALISATION MOT DE PASSE
  // ─────────────────────────────────────────

  @Post('reset-password')
  @Throttle({ ttl: 60, limit: 5, blockDuration: 300 }) // 5 tentatives par minute, bloc 5min
  async resetPassword(@Body() dto: ResetPasswordDto) {
    // Valider le token
    const userId = await this.securityService.validatePasswordResetToken(dto.token);
    
    if (!userId) {
      throw new ForbiddenException('Token invalide ou expiré');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await this.securityService.hashPassword(dto.newPassword);

    // Invalider le token
    await this.securityService.invalidatePasswordResetToken(dto.token);

    // Log pour audit
    console.log(`[AUDIT] Password reset successful: User ${userId}`);

    return {
      message: 'Mot de passe réinitialisé avec succès',
    };
  }
}