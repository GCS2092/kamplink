import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // LECTURE
  // ─────────────────────────────────────────

  async getMyNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { utilisateurId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { utilisateurId: userId },
      }),
    ]);

    const nonLues = await this.prisma.notification.count({
      where: { utilisateurId: userId, estLue: false },
    });

    return {
      data: notifications,
      meta: {
        total,
        nonLues,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { utilisateurId: userId, estLue: false },
    });
    return { count };
  }

  // ─────────────────────────────────────────
  // CRÉATION (interne - utilisé par d'autres services)
  // ─────────────────────────────────────────

  async createNotification(
    userId: string,
    type: 'opportunite' | 'message' | 'document' | 'mention' | 'systeme' | 'moderation',
    titre: string,
    corps: string,
    donnees?: any,
  ) {
    return this.prisma.notification.create({
      data: {
        utilisateurId: userId,
        type,
        titre,
        corps,
        donnees: donnees || {},
      },
    });
  }

  // ─────────────────────────────────────────
  // MISE À JOUR
  // ─────────────────────────────────────────

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) throw new NotFoundException('Notification introuvable');
    if (notification.utilisateurId !== userId) {
      throw new NotFoundException('Notification introuvable');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        estLue: true,
        lueLe: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        utilisateurId: userId,
        estLue: false,
      },
      data: {
        estLue: true,
        lueLe: new Date(),
      },
    });

    return { message: 'Toutes les notifications marquées comme lues' };
  }

  // ─────────────────────────────────────────
  // SUPPRESSION
  // ─────────────────────────────────────────

  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) throw new NotFoundException('Notification introuvable');
    if (notification.utilisateurId !== userId) {
      throw new NotFoundException('Notification introuvable');
    }

    return this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async deleteAllNotifications(userId: string) {
    await this.prisma.notification.deleteMany({
      where: { utilisateurId: userId },
    });

    return { message: 'Toutes les notifications supprimées' };
  }
}
