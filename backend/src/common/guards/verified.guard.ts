import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

const EXEMPTS = ['admin', 'superadmin', 'delegate', 'content_admin', 'company'];

// RG-02: un compte non verifie est en lecture seule.
// Actif seulement si ENFORCE_VERIFICATION=true (a activer une fois un superadmin cree).
@Injectable()
export class VerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.ENFORCE_VERIFICATION !== 'true') return true;
    const user = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Utilisateur non authentifié');
    if (EXEMPTS.includes(user.role)) return true;
    if (user.profil?.statutVerification === 'verified') return true;
    throw new ForbiddenException('Compte non vérifié : faites valider votre carte étudiante');
  }
}