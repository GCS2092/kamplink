import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';

export type NotifType = 'opportunite' | 'message' | 'document' | 'mention' | 'systeme' | 'moderation';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private firebase: FirebaseService,
  ) {}

  // ---------- Lecture ----------

  async getMyNotifications(userId: string, page: number = 1, limit: number = 20) {
    page = Math.max(1, page || 1);
    limit = Math.min(Math.max(1, limit || 20), 100);
    const skip = (page - 1) * limit;

    const [notifications, total, nonLues] = await Promise.all([
      this.prisma.notification.findMany({
        where: { utilisateurId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { utilisateurId: userId } }),
      this.prisma.notification.count({ where: { utilisateurId: userId, estLue: false } }),
    ]);

    return {
      data: notifications,
      meta: { total, nonLues, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { utilisateurId: userId, estLue: false },
    });
    return { count };
  }

  // ---------- Creation (appelee par les autres services) ----------

  // Cree la notification en base puis tente le push (le push n'est jamais bloquant)
  async createNotification(
    userId: string,
    type: NotifType,
    titre: string,
    corps: string,
    donnees?: Record<string, any>,
  ) {
    const notification = await this.prisma.notification.create({
      data: { utilisateurId: userId, type, titre, corps, donnees: donnees || {} },
    });
    void this.sendPush(userId, titre, corps, donnees);
    return notification;
  }

  // Version "ne jamais echouer": a utiliser dans les services metier
  notifySafe(
    userId: string,
    type: NotifType,
    titre: string,
    corps: string,
    donnees?: Record<string, any>,
  ): void {
    this.createNotification(userId, type, titre, corps, donnees).catch((e) =>
      this.logger.warn(`Notification ignoree: ${(e as Error).message}`),
    );
  }

  private async sendPush(userId: string, titre: string, corps: string, donnees?: Record<string, any>) {
    try {
      const tokens = await this.prisma.tokenAppareil.findMany({
        where: { utilisateurId: userId, estActif: true },
        select: { token: true },
      });
      if (!tokens.length) return;

      const data: Record<string, string> = {};
      for (const [k, v] of Object.entries(donnees || {})) data[k] = String(v);

      const list = tokens.map((t) => t.token);
      const res = await this.firebase.sendMulticast({ tokens: list, title: titre, body: corps, data });

      // Desactive les appareils refuses par FCM (application desinstallee, token expire)
      const dead: string[] = [];
      res.responses.forEach((r, i) => {
        const code = r.error?.code;
        if (
          !r.success &&
          (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token')
        ) {
          dead.push(list[i]);
        }
      });
      if (dead.length) {
        await this.prisma.tokenAppareil.updateMany({
          where: { token: { in: dead } },
          data: { estActif: false },
        });
      }
    } catch (e) {
      this.logger.warn(`Push ignore: ${(e as Error).message}`);
    }
  }

  // ---------- Appareils ----------

  // Un meme token peut changer de compte (changement d'utilisateur sur le telephone)
  async registerDeviceToken(userId: string, token: string, plateforme: string) {
    await this.prisma.tokenAppareil.upsert({
      where: { token },
      update: { utilisateurId: userId, plateforme, estActif: true },
      create: { utilisateurId: userId, token, plateforme },
    });
    return { message: 'Appareil enregistré' };
  }

  async unregisterDeviceToken(userId: string, token: string) {
    await this.prisma.tokenAppareil.deleteMany({ where: { token, utilisateurId: userId } });
    return { message: 'Appareil supprimé' };
  }

  // ---------- Mise a jour / suppression ----------

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.utilisateurId !== userId) {
      throw new NotFoundException('Notification introuvable');
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { estLue: true, lueLe: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { utilisateurId: userId, estLue: false },
      data: { estLue: true, lueLe: new Date() },
    });
    return { message: 'Toutes les notifications marquées comme lues' };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.utilisateurId !== userId) {
      throw new NotFoundException('Notification introuvable');
    }
    return this.prisma.notification.delete({ where: { id: notificationId } });
  }

  async deleteAllNotifications(userId: string) {
    await this.prisma.notification.deleteMany({ where: { utilisateurId: userId } });
    return { message: 'Toutes les notifications supprimées' };
  }
}