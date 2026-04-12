import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private firebase: FirebaseService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    // Vérifie que le header Authorization existe et est bien formé
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token manquant');
    }

    const token = authHeader.split(' ')[1];

    try {
      // 1. Vérifie le token avec Firebase
      const decoded = await this.firebase.verifyToken(token);

      // 2. Cherche l'utilisateur dans PostgreSQL via firebase_uid
      const user = await this.prisma.utilisateur.findUnique({
        where: { firebaseUid: decoded.uid },
        include: { profil: true },
      });

      if (!user) {
        throw new UnauthorizedException('Utilisateur introuvable');
      }

      if (user.estBanni) {
        throw new UnauthorizedException('Compte suspendu');
      }

      // 3. Attache l'utilisateur à la requête — accessible dans tous les controllers
      request.user = user;
      return true;

    } catch (error) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }
}
