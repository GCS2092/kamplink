import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SanitizationService } from '../common/services/sanitization.service';
import { CanalAccessService, MODERATOR_ROLES } from '../common/services/canal-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

type Actor = { id: string; role: string };

const AUTEUR = {
  select: {
    id: true,
    profil: {
      select: { prenom: true, nom: true, avatarUrl: true, statutVerification: true },
    },
  },
};

function paginate(page: number, limit: number, defLimit: number) {
  const p = Math.max(1, Number.isFinite(page) ? page : 1);
  const l = Math.min(Math.max(1, Number.isFinite(limit) ? limit : defLimit), 100);
  return { page: p, limit: l, skip: (p - 1) * l };
}

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private canalAccess: CanalAccessService,
    private sanitization: SanitizationService,
    private notifications: NotificationsService,
  ) {}

  // Masque l'auteur d'un message anonyme (sauf pour l'auteur et les moderateurs)
  private mask(msg: any, viewer: Actor): any {
    if (!msg || !msg.estAnonyme) return msg;
    const canSee = msg.auteurId === viewer.id || ['admin', 'superadmin'].includes(viewer.role);
    if (canSee) return msg;
    return { ...msg, auteurId: null, auteur: null };
  }

  // ---------- Lecture ----------

  async getMessagesByCanal(user: Actor, canalId: string, page = 1, limit = 50) {
    await this.canalAccess.assertCanAccess(user, canalId);
    const pg = paginate(page, limit, 50);
    const where = { canalId, estMasque: false, deletedAt: null, parentId: null };

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.limit,
        include: {
          auteur: AUTEUR,
          _count: { select: { reponses: true, signalements: true } },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data: messages.map((m) => this.mask(m, user)),
      meta: { total, page: pg.page, limit: pg.limit, totalPages: Math.ceil(total / pg.limit) },
    };
  }

  async getMessageById(user: Actor, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        auteur: AUTEUR,
        canal: { select: { id: true, nom: true, espaceId: true } },
        reponses: {
          where: { estMasque: false, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: { auteur: AUTEUR },
        },
        _count: { select: { reponses: true, signalements: true } },
      },
    });

    if (
      !message ||
      message.deletedAt ||
      (message.estMasque && !MODERATOR_ROLES.includes(user.role))
    ) {
      throw new NotFoundException('Message introuvable');
    }
    await this.canalAccess.assertCanAccess(user, message.canalId);

    return {
      ...this.mask(message, user),
      reponses: message.reponses.map((r) => this.mask(r, user)),
    };
  }

  async getReponses(user: Actor, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('Message introuvable');
    await this.canalAccess.assertCanAccess(user, message.canalId);

    const reponses = await this.prisma.message.findMany({
      where: { parentId: messageId, estMasque: false, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { auteur: AUTEUR, _count: { select: { signalements: true } } },
    });
    return reponses.map((r) => this.mask(r, user));
  }

  async searchMessages(user: Actor, canalId: string, query: string, page = 1, limit = 20) {
    if (!query || !query.trim()) throw new BadRequestException('Paramètre q requis');
    await this.canalAccess.assertCanAccess(user, canalId);
    const pg = paginate(page, limit, 20);
    const where = {
      canalId,
      estMasque: false,
      deletedAt: null,
      contenu: { contains: query.trim(), mode: 'insensitive' as const },
    };

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.limit,
        include: { auteur: AUTEUR },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data: messages.map((m) => this.mask(m, user)),
      meta: { total, page: pg.page, limit: pg.limit, totalPages: Math.ceil(total / pg.limit) },
    };
  }

  // ---------- Creation / modification ----------

  async createMessage(user: Actor, dto: CreateMessageDto) {
    await this.canalAccess.assertCanAccess(user, dto.canalId);

    let parentAuteurId: string | null = null;
    if (dto.parentId) {
      const parent = await this.prisma.message.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.deletedAt) throw new NotFoundException('Message parent introuvable');
      if (parent.canalId !== dto.canalId) {
        throw new ForbiddenException("Le message parent n'est pas dans ce canal");
      }
      parentAuteurId = parent.auteurId;
    }

    const contenu = this.sanitization.sanitizeHtml(dto.contenu);
    if (!contenu.trim()) throw new BadRequestException('Message vide');

    const created = await this.prisma.message.create({
      data: {
        canalId: dto.canalId,
        auteurId: user.id,
        parentId: dto.parentId,
        type: dto.type,
        contenu,
        estAnonyme: dto.estAnonyme ?? false,
      },
      include: { auteur: AUTEUR },
    });

    // Prevenir l'auteur du message parent (texte generique: respecte l'anonymat)
    if (parentAuteurId && parentAuteurId !== user.id) {
      this.notifications.notifySafe(
        parentAuteurId,
        'message',
        'Nouvelle réponse',
        "Quelqu'un a répondu à votre message",
        { messageId: created.id, parentId: dto.parentId as string, canalId: dto.canalId },
      );
    }

    return created;
  }

  async updateMessage(user: Actor, messageId: string, dto: UpdateMessageDto) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('Message introuvable');
    if (message.auteurId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres messages');
    }

    const data: any = {};
    if (dto.contenu) {
      const contenu = this.sanitization.sanitizeHtml(dto.contenu);
      if (!contenu.trim()) throw new BadRequestException('Message vide');
      data.contenu = contenu;
    }
    return this.prisma.message.update({ where: { id: messageId }, data });
  }

  async deleteMessage(user: Actor, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('Message introuvable');

    const isModerator = await this.canalAccess.canModerate(user, message.canalId);
    if (message.auteurId !== user.id && !isModerator) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }

  // ---------- Votes (RG-06): un vote par utilisateur et par message ----------

  async voteMessage(user: Actor, messageId: string, vote: 'up' | 'down') {
    const target = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!target || target.deletedAt) throw new NotFoundException('Message introuvable');
    await this.canalAccess.assertCanAccess(user, target.canalId);
    if (target.auteurId === user.id) {
      throw new ForbiddenException('Vous ne pouvez pas voter pour vos propres messages');
    }

    const valeur = vote === 'up' ? 1 : -1;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.voteMessage.findUnique({
        where: { messageId_utilisateurId: { messageId, utilisateurId: user.id } },
      });

      // delta = variation du nombre de votes positifs (et de la reputation de l'auteur)
      let delta = 0;
      let monVote: 'up' | 'down' | null = vote;

      if (!existing) {
        await tx.voteMessage.create({ data: { messageId, utilisateurId: user.id, valeur } });
        delta = valeur === 1 ? 1 : 0;
      } else if (existing.valeur === valeur) {
        // Meme vote renvoye: on l'annule
        await tx.voteMessage.delete({ where: { id: existing.id } });
        delta = valeur === 1 ? -1 : 0;
        monVote = null;
      } else {
        await tx.voteMessage.update({ where: { id: existing.id }, data: { valeur } });
        delta = valeur === 1 ? 1 : -1;
      }

      if (delta !== 0) {
        await tx.profil.updateMany({
          where: { utilisateurId: target.auteurId },
          data: { scoreReputation: { increment: delta } },
        });
      }

      const message =
        delta !== 0
          ? await tx.message.update({
              where: { id: messageId },
              data: { votesPositifs: { increment: delta } },
            })
          : target;

      return { ...message, monVote };
    });
  }

  // ---------- Epingler (admin/delegate) ----------

  async toggleEpingle(user: Actor, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('Message introuvable');
    await this.canalAccess.assertCanModerate(user, message.canalId);

    return this.prisma.message.update({
      where: { id: messageId },
      data: { estEpingle: !message.estEpingle },
    });
  }
}