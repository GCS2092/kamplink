import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private firebase: FirebaseService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient();
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('Token manquant');
      }

      // Verify Firebase token
      const decoded = await this.firebase.verifyToken(token);

      // Get user from database
      const user = await this.prisma.utilisateur.findUnique({
        where: { firebaseUid: decoded.uid },
        include: { profil: true },
      });

      if (!user) {
        throw new WsException('Utilisateur introuvable');
      }

      if (user.estBanni) {
        throw new WsException('Compte suspendu');
      }

      // Attach user to socket
      (client as any).user = user;
      return true;

    } catch (error) {
      this.logger.warn(`WebSocket auth failed: ${error.message}`);
      throw new WsException('Authentification échouée');
    }
  }

  private extractToken(client: any): string | null {
    // Try to get token from handshake auth or query
    const auth = client.handshake?.auth;
    if (auth?.token) {
      return auth.token.replace('Bearer ', '');
    }

    const query = client.handshake?.query;
    if (query?.token) {
      return String(query.token).replace('Bearer ', '');
    }

    return null;
  }
}
