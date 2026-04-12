import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOpportuniteDto } from './dto/create-opportunite.dto';
import { UpdateOpportuniteDto } from './dto/update-opportunite.dto';

@Injectable()
export class OpportunitesService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // LECTURE PUBLIQUE
  // ─────────────────────────────────────────

  async getAllOpportunites(
    page: number = 1,
    limit: number = 20,
    filters?: {
      typeOffre?: string;
      domaine?: string;
      niveauRequis?: string;
      estExpiree?: boolean;
    },
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      estActive: true,
      deletedAt: null,
    };

    if (filters?.typeOffre) where.typeOffre = filters.typeOffre;
    if (filters?.domaine) where.domaine = { contains: filters.domaine, mode: 'insensitive' };
    if (filters?.niveauRequis) where.niveauRequis = filters.niveauRequis;
    if (filters?.estExpiree === false) where.estExpiree = false;

    const [opportunites, total] = await Promise.all([
      this.prisma.opportunite.findMany({
        where,
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
          tags: true,
          _count: {
            select: { signalements: true },
          },
        },
      }),
      this.prisma.opportunite.count({ where }),
    ]);

    return {
      data: opportunites,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOpportuniteById(opportuniteId: string) {
    const opportunite = await this.prisma.opportunite.findUnique({
      where: { id: opportuniteId },
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
        tags: true,
        _count: {
          select: { signalements: true },
        },
      },
    });

    if (!opportunite || opportunite.deletedAt) {
      throw new NotFoundException('Opportunité introuvable');
    }

    // Incrémenter les vues
    await this.prisma.opportunite.update({
      where: { id: opportuniteId },
      data: { nbVues: { increment: 1 } },
    });

    return opportunite;
  }

  async searchOpportunites(query: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where: any = {
      estActive: true,
      deletedAt: null,
      OR: [
        { titre: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { entreprise: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [opportunites, total] = await Promise.all([
      this.prisma.opportunite.findMany({
        where,
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
                },
              },
            },
          },
          tags: true,
        },
      }),
      this.prisma.opportunite.count({ where }),
    ]);

    return {
      data: opportunites,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────
  // MES OPPORTUNITÉS (créées par l'utilisateur)
  // ─────────────────────────────────────────

  async getMyOpportunites(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [opportunites, total] = await Promise.all([
      this.prisma.opportunite.findMany({
        where: {
          auteurId: userId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tags: true,
          _count: {
            select: { signalements: true },
          },
        },
      }),
      this.prisma.opportunite.count({
        where: { auteurId: userId, deletedAt: null },
      }),
    ]);

    return {
      data: opportunites,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────
  // CRÉATION / MODIFICATION
  // ─────────────────────────────────────────

  async createOpportunite(userId: string, dto: CreateOpportuniteDto) {
    const opportunite = await this.prisma.opportunite.create({
      data: {
        auteurId: userId,
        titre: dto.titre,
        description: dto.description,
        entreprise: dto.entreprise,
        typeOffre: dto.typeOffre,
        domaine: dto.domaine,
        niveauRequis: dto.niveauRequis,
        dateLimite: dto.dateLimite ? new Date(dto.dateLimite) : null,
        localisation: dto.localisation,
        urlExterne: dto.urlExterne,
      },
      include: {
        auteur: {
          select: {
            id: true,
            profil: {
              select: {
                prenom: true,
                nom: true,
              },
            },
          },
        },
      },
    });

    // Créer les tags si fournis
    if (dto.tags && dto.tags.length > 0) {
      await Promise.all(
        dto.tags.map((tag) =>
          this.prisma.opportuniteTag.create({
            data: {
              opportuniteId: opportunite.id,
              tag: tag.toLowerCase().trim(),
            },
          }),
        ),
      );
    }

    return this.getOpportuniteById(opportunite.id);
  }

  async updateOpportunite(userId: string, opportuniteId: string, dto: UpdateOpportuniteDto) {
    const opportunite = await this.prisma.opportunite.findUnique({
      where: { id: opportuniteId },
    });

    if (!opportunite || opportunite.deletedAt) {
      throw new NotFoundException('Opportunité introuvable');
    }

    if (opportunite.auteurId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres opportunités');
    }

    const updated = await this.prisma.opportunite.update({
      where: { id: opportuniteId },
      data: {
        ...(dto.titre && { titre: dto.titre }),
        ...(dto.description && { description: dto.description }),
        ...(dto.entreprise !== undefined && { entreprise: dto.entreprise }),
        ...(dto.typeOffre && { typeOffre: dto.typeOffre }),
        ...(dto.domaine !== undefined && { domaine: dto.domaine }),
        ...(dto.niveauRequis && { niveauRequis: dto.niveauRequis }),
        ...(dto.dateLimite && { dateLimite: new Date(dto.dateLimite) }),
        ...(dto.localisation !== undefined && { localisation: dto.localisation }),
        ...(dto.urlExterne !== undefined && { urlExterne: dto.urlExterne }),
        ...(dto.estActive !== undefined && { estActive: dto.estActive }),
      },
    });

    // Mettre à jour les tags si fournis
    if (dto.tags) {
      // Supprimer les anciens tags
      await this.prisma.opportuniteTag.deleteMany({
        where: { opportuniteId },
      });

      // Créer les nouveaux
      if (dto.tags.length > 0) {
        await Promise.all(
          dto.tags.map((tag) =>
            this.prisma.opportuniteTag.create({
              data: {
                opportuniteId,
                tag: tag.toLowerCase().trim(),
              },
            }),
          ),
        );
      }
    }

    return this.getOpportuniteById(updated.id);
  }

  async deleteOpportunite(userId: string, opportuniteId: string) {
    const opportunite = await this.prisma.opportunite.findUnique({
      where: { id: opportuniteId },
    });

    if (!opportunite || opportunite.deletedAt) {
      throw new NotFoundException('Opportunité introuvable');
    }

    if (opportunite.auteurId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres opportunités');
    }

    // Soft delete
    return this.prisma.opportunite.update({
      where: { id: opportuniteId },
      data: { deletedAt: new Date() },
    });
  }

  // ─────────────────────────────────────────
  // ADMIN / MODÉRATION
  // ─────────────────────────────────────────

  async approveOpportunite(opportuniteId: string) {
    const opportunite = await this.prisma.opportunite.findUnique({
      where: { id: opportuniteId },
    });
    if (!opportunite) throw new NotFoundException('Opportunité introuvable');

    return this.prisma.opportunite.update({
      where: { id: opportuniteId },
      data: { estActive: true },
    });
  }

  async rejectOpportunite(opportuniteId: string) {
    const opportunite = await this.prisma.opportunite.findUnique({
      where: { id: opportuniteId },
    });
    if (!opportunite) throw new NotFoundException('Opportunité introuvable');

    return this.prisma.opportunite.update({
      where: { id: opportuniteId },
      data: { estActive: false },
    });
  }

  async markAsExpired(opportuniteId: string) {
    const opportunite = await this.prisma.opportunite.findUnique({
      where: { id: opportuniteId },
    });
    if (!opportunite) throw new NotFoundException('Opportunité introuvable');

    return this.prisma.opportunite.update({
      where: { id: opportuniteId },
      data: { estExpiree: true },
    });
  }
}
