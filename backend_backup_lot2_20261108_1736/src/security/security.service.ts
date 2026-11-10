import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly MAX_ATTEMPTS = 3;
  private readonly BLOCK_DURATION_MINUTES = 15;
  private readonly SALT_ROUNDS = 12;

  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // GESTION DES TENTATIVES DE CONNEXION
  // ─────────────────────────────────────────

  async recordLoginAttempt(
    telephone: string,
    ip: string,
    userAgent: string,
    success: boolean,
    userId?: string,
  ): Promise<void> {
    const statut = success ? 'reussi' : 'echoue';
    
    if (success && userId) {
      // Réinitialiser les échecs après connexion réussie
      await this.prisma.tentativeConnexion.updateMany({
        where: { 
          OR: [
            { utilisateurId: userId },
            { telephone }
          ],
          statut: { in: ['echoue', 'bloque'] }
        },
        data: { nbEchecs: 0, bloqueJusqua: null, statut: 'reussi' }
      });
      
      this.logger.log(`Connexion réussie - User: ${userId}, IP: ${ip}`);
      return;
    }

    // Compter les échecs récents
    const recentFailures = await this.prisma.tentativeConnexion.findFirst({
      where: {
        OR: [
          { telephone },
          { ip }
        ],
        statut: { in: ['echoue', 'bloque'] },
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24h
      },
      orderBy: { updatedAt: 'desc' }
    });

    const nbEchecs = recentFailures ? recentFailures.nbEchecs + 1 : 1;
    
    if (nbEchecs >= this.MAX_ATTEMPTS) {
      const bloqueJusqua = new Date(Date.now() + this.BLOCK_DURATION_MINUTES * 60 * 1000);
      
      await this.prisma.tentativeConnexion.create({
        data: {
          telephone,
          ip,
          userAgent,
          statut: 'bloque',
          nbEchecs,
          bloqueJusqua,
        }
      });
      
      this.logger.warn(
        `Compte bloqué - Téléphone: ${telephone}, IP: ${ip}, Échecs: ${nbEchecs}, Jusqu'à: ${bloqueJusqua}`
      );
      
      throw new ForbiddenException(
        `Compte temporairement bloqué. Réessayez après ${this.BLOCK_DURATION_MINUTES} minutes.`
      );
    }

    await this.prisma.tentativeConnexion.create({
      data: {
        telephone,
        ip,
        userAgent,
        statut: 'echoue',
        nbEchecs,
      }
    });

    this.logger.warn(
      `Échec connexion - Téléphone: ${telephone}, IP: ${ip}, Échecs: ${nbEchecs}/${this.MAX_ATTEMPTS}`
    );
  }

  async isAccountBlocked(telephone: string, ip: string): Promise<boolean> {
    const block = await this.prisma.tentativeConnexion.findFirst({
      where: {
        OR: [{ telephone }, { ip }],
        statut: 'bloque',
        bloqueJusqua: { gt: new Date() }
      }
    });

    if (block) {
      const minutesRemaining = Math.ceil(
        (block.bloqueJusqua!.getTime() - Date.now()) / 60000
      );
      throw new ForbiddenException(
        `Compte bloqué. Réessayez dans ${minutesRemaining} minutes.`
      );
    }

    return false;
  }

  // ─────────────────────────────────────────
  // HACHAGE BCRYPT
  // ─────────────────────────────────────────

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ─────────────────────────────────────────
  // TOKENS RÉINITIALISATION MOT DE PASSE
  // ─────────────────────────────────────────

  async createPasswordResetToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expireLe = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalider les anciens tokens
    await this.prisma.tokenResetPassword.updateMany({
      where: { utilisateurId: userId, utiliseLe: null },
      data: { utiliseLe: new Date() }
    });

    await this.prisma.tokenResetPassword.create({
      data: {
        utilisateurId: userId,
        token,
        expireLe,
      }
    });

    this.logger.log(`Token reset créé - User: ${userId}`);
    return token;
  }

  async validatePasswordResetToken(token: string): Promise<string | null> {
    const record = await this.prisma.tokenResetPassword.findUnique({
      where: { token }
    });

    if (!record) return null;
    if (record.utiliseLe) return null;
    if (record.expireLe < new Date()) return null;

    return record.utilisateurId;
  }

  async invalidatePasswordResetToken(token: string): Promise<void> {
    await this.prisma.tokenResetPassword.update({
      where: { token },
      data: { utiliseLe: new Date() }
    });
    
    this.logger.log(`Token reset invalidé`);
  }

  // ─────────────────────────────────────────
  // BLOCAGE IP
  // ─────────────────────────────────────────

  async isIpBlocked(ip: string): Promise<boolean> {
    const blocked = await this.prisma.ipBloquee.findFirst({
      where: {
        ip,
        OR: [
          { expireLe: null },
          { expireLe: { gt: new Date() } }
        ]
      }
    });

    return !!blocked;
  }

  async recordSuspiciousIp(ip: string, raison: string): Promise<void> {
    const existing = await this.prisma.ipBloquee.findUnique({
      where: { ip }
    });

    if (existing) {
      await this.prisma.ipBloquee.update({
        where: { ip },
        data: {
          nbRequetes: { increment: 1 },
          derniereRequete: new Date(),
          raison,
        }
      });
      
      // Bloquer automatiquement après 10 requêtes suspectes
      if (existing.nbRequetes + 1 >= 10 && !existing.expireLe) {
        await this.prisma.ipBloquee.update({
          where: { ip },
          data: { expireLe: new Date(Date.now() + 60 * 60 * 1000) } // 1h
        });
        
        this.logger.error(`IP automatiquement bloquée: ${ip}`);
      }
    } else {
      await this.prisma.ipBloquee.create({
        data: { ip, raison }
      });
    }
  }

  async unblockIp(ip: string): Promise<void> {
    await this.prisma.ipBloquee.deleteMany({
      where: { ip }
    });
    
    this.logger.log(`IP débloquée: ${ip}`);
  }
}
