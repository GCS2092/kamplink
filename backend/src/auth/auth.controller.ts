import { Controller, Post, Body, Headers, Ip, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SecurityService } from '../security/security.service';
import { LoginDto } from './dto/login.dto';
import { Throttle } from '../redis/redis-throttler.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private securityService: SecurityService,
  ) {}

  // Connexion par OTP Firebase: le mobile envoie son idToken.
  // Le profil academique se cree ensuite via POST /users/me/profile.
  @Post('login')
  @Throttle({ ttl: 60, limit: 5, blockDuration: 900 })
  async login(
    @Body() body: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    if (await this.securityService.isIpBlocked(ip)) {
      throw new ForbiddenException('Accès interdit - IP bloquée');
    }

    // Les echecs sont comptes par IP (le telephone n'est connu qu'apres verification du token)
    const identifier = `ip:${ip}`;
    await this.securityService.isAccountBlocked(identifier, ip);

    try {
      const result = await this.authService.loginWithFirebaseToken(body.idToken);
      await this.securityService.recordLoginAttempt(
        result.user.telephone || identifier,
        ip,
        userAgent || 'unknown',
        true,
        result.user.id,
      );
      return result;
    } catch (error) {
      await this.securityService.recordLoginAttempt(identifier, ip, userAgent || 'unknown', false);
      throw error;
    }
  }
}