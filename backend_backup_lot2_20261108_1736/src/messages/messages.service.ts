import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // LECTURE DES MESSAGES
  // ─────────────────────────────────────────

  async getMessagesByCanal(canalId: string, page: number = 1, limit: number = 50) {
    const canal = await this.prisma.canal.findUnique({
      where: { id: canalId },
    });
    if (!canal) throw new NotFoundException('Canal introuvable');

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          canalId,
          estMasque: false, deletedAt: null,
          parentId: null, // Messages principaux uniquement
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          auteur: {
            select: {
              id: true,
              profil: {
                select: {
                  prenom: true,
                  nom: true,
                  avatarUrl: true,
                  statutVerification: true,
                },
              },
            },
          },
          _count: {
            select: { reponses: true, signalements: true },
          },
        },
      }),
      this.prisma.message.count({
        where: { canalId, estMasque: false, deletedAt: null, parentId: null },
      }),
    ]);

    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMessageById(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        auteur: {
          select: {
            id: true,
            profil: {
              select: {
                prenom: true,
                nom: true,
                avatarUrl: true,
                statutVerification: true,
              },
            },
          },
        },
        canal: {
          select: { id: true, nom: true, espaceId: true },
        },
        reponses: {
          where: { estMasque: false, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            auteur: {
              select: {
                id: true,
                profil: {
                  select: {
                    prenom: true,
                    nom: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { reponses: true, signalements: true },
        },
      },
    });

    if (!message || message.deletedAt) throw new NotFoundException('Message introuvable');

    return message;
  }

  async getReponses(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.deletedAt) throw new NotFoundException('Message introuvable');

    return this.prisma.message.findMany({
      where: { parentId: messageId, estMasque: false, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        auteur: {
          select: {
            id: true,
            profil: {
              select: {
                prenom: true,
                nom: true,
                avatarUrl: true,
                statutVerification: true,
              },
            },
          },
        },
        _count: {
          select: { signalements: true },
        },
      },
    });
  }

  // ─────────────────────────────────────────
  // CRÉATION / MODIFICATION
  // ─────────────────────────────────────────

  async createMessage(userId: string, dto: CreateMessageDto) {
    const canal = await this.prisma.canal.findUnique({
      where: { id: dto.canalId },
      include: { espace: true },
    });
    if (!canal) throw new NotFoundException('Canal introuvable');

    // Vérifier que l'utilisateur peut poster (membre ou canal public)
    if (!canal.estPublic) {
      const member = await this.prisma.canalMembre.findUnique({
        where: {
          canalId_utilisateurId: {
            canalId: dto.canalId,
            utilisateurId: userId,
          },
        },
      });
      if (!member) {
        throw new ForbiddenException('Canal privé - accès réservé');
      }
    }

    // Vérifier le parent si réponse
    if (dto.parentId) {
      const parent = await this.prisma.message.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Message parent introuvable');
      if (parent.canalId !== dto.canalId) {
        throw new ForbiddenException('Le message parent n\'est pas dans ce canal');
      }
    }

    return this.prisma.message.create({
      data: {
        canalId: dto.canalId,
        auteurId: userId,
        parentId: dto.parentId,
        type: dto.type,
        contenu: dto.contenu,
        estAnonyme: dto.estAnonyme ?? false,
      },
      include: {
        auteur: {
          select: {
            id: true,
            profil: {
              select: {
                prenom: true,
                nom: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async updateMessage(userId: string, messageId: string, dto: UpdateMessageDto) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.deletedAt) throw new NotFoundException('Message introuvable');

    // Seul l'auteur ou un admin peut modifier
    if (message.auteurId !== userId) {
      // Vérifier si admin - on laisse passer pour l'instant, vérifié par guard
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres messages');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        ...(dto.contenu && { contenu: dto.contenu }),
      },
    });
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.deletedAt) throw new NotFoundException('Message introuvable');

    if (message.auteurId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages');
    }

    // Soft delete
    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }

  // ─────────────────────────────────────────
  // VOTES (RG-06 : réputation)
  // ─────────────────────────────────────────

  async voteMessage(userId: string, messageId: string, vote: 'up' | 'down') {
    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.findUnique({
        where: { id: messageId },
      });
      if (!message || message.deletedAt) throw new NotFoundException('Message introuvable');

      // Pas de vote sur ses propres messages
      if (message.auteurId === userId) {
        throw new ForbiddenException('Vous ne pouvez pas voter pour vos propres messages');
      }

      if (vote === 'up') {
        // Incrémenter le score de réputation de l'auteur
        await tx.profil.update({
          where: { utilisateurId: message.auteurId },
          data: { scoreReputation: { increment: 1 } },
        });

        return tx.message.update({
          where: { id: messageId },
          data: { votesPositifs: { increment: 1 } },
        });
      }

      // Downvote - on ne diminue pas la réputation pour l'instant
      return tx.message.update({
        where: { id: messageId },
        data: { votesPositifs: { decrement: 1 } },
      });
    });
  }

  // ─────────────────────────────────────────
  // ÉPINER (admin/delegate)
  // ─────────────────────────────────────────

  async toggleEpingle(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.deletedAt) throw new NotFoundException('Message introuvable');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { estEpingle: !message.estEpingle },
    });
  }

  // ─────────────────────────────────────────
  // RECHERCHE
  // ─────────────────────────────────────────

  async searchMessages(canalId: string, query: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          canalId,
          estMasque: false, deletedAt: null,
          contenu: { contains: query, mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          auteur: {
            select: {
              id: true,
              profil: {
                select: {
                  prenom: true,
                  nom: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.message.count({
        where: {
          canalId,
          estMasque: false, deletedAt: null,
          contenu: { contains: query, mode: 'insensitive' },
        },
      }),
    ]);

    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
