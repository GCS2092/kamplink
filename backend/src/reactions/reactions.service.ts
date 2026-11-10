import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CanalAccessService } from '../common/services/canal-access.service';

type Actor = { id: string; role: string };
const MAX_REACTIONS_PAR_UTILISATEUR = 10;

@Injectable()
export class ReactionsService {
  constructor(
    private prisma: PrismaService,
    private canalAccess: CanalAccessService,
  ) {}

  private async assertMessage(user: Actor, messageId: string) {
    const m = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!m || m.deletedAt || m.estMasque) throw new NotFoundException('Message introuvable');
    await this.canalAccess.assertCanAccess(user, m.canalId);
    return m;
  }

  async summary(user: Actor, messageId: string) {
    const [groups, mine] = await Promise.all([
      this.prisma.messageReaction.groupBy({
        by: ['emoji'],
        where: { messageId },
        _count: { emoji: true },
      }),
      this.prisma.messageReaction.findMany({
        where: { messageId, auteurId: user.id },
        select: { emoji: true },
      }),
    ]);
    return {
      reactions: groups.map((g) => ({ emoji: g.emoji, count: g._count.emoji })),
      mine: mine.map((m) => m.emoji),
    };
  }

  async list(user: Actor, messageId: string) {
    await this.assertMessage(user, messageId);
    return this.summary(user, messageId);
  }

  // Meme emoji deja pose par l'utilisateur = on le retire
  async toggle(user: Actor, messageId: string, emoji: string) {
    await this.assertMessage(user, messageId);
    const clean = emoji.trim();
    if (!clean) throw new BadRequestException('Emoji invalide');

    const existing = await this.prisma.messageReaction.findUnique({
      where: { messageId_auteurId_emoji: { messageId, auteurId: user.id, emoji: clean } },
    });
    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      const n = await this.prisma.messageReaction.count({
        where: { messageId, auteurId: user.id },
      });
      if (n >= MAX_REACTIONS_PAR_UTILISATEUR) {
        throw new BadRequestException('Trop de réactions sur ce message');
      }
      await this.prisma.messageReaction.create({
        data: { messageId, auteurId: user.id, emoji: clean },
      });
    }
    return this.summary(user, messageId);
  }
}