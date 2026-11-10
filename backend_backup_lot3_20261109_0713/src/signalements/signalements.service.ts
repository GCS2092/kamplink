import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { UpdateSignalementDto } from './dto/update-signalement.dto';

@Injectable()
export class SignalementsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // CRÉATION
  // ─────────────────────────────────────────

  async createSignalement(userId: string, dto: CreateSignalementDto) {
    // Vérifier qu'il y a au moins une cible
    if (!dto.cibleUserId && !dto.messageId && !dto.documentId && !dto.opportuniteId) {
      throw new BadRequestException('Vous devez spécifier une cible pour le signalement');
    }

    return this.prisma.signalement.create({
      data: {
        rapporteurId: userId,
        cibleUserId: dto.cibleUserId,
        messageId: dto.messageId,
        documentId: dto.documentId,
        opportuniteId: dto.opportuniteId,
        raison: dto.raison,
        details: dto.details,
        statut: 'ouvert',
      },
      include: {
        rapporteur: {
          select: {
            id: true,
            profil: { select: { prenom: true, nom: true } },
          },
        },
      },
    });
  }

  // ─────────────────────────────────────────
  // LECTURE (ADMIN/DELEGATE)
  // ─────────────────────────────────────────

  async getAllSignalements(
    statut?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (statut) where.statut = statut;

    const [signalements, total] = await Promise.all([
      this.prisma.signalement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          rapporteur: {
            select: {
              id: true,
              profil: { select: { prenom: true, nom: true } },
            },
          },
          cibleUser: {
            select: {
              id: true,
              profil: { select: { prenom: true, nom: true } },
            },
          },
          message: { select: { id: true, contenu: true } },
          document: { select: { id: true, titre: true } },
          opportunite: { select: { id: true, titre: true } },
        },
      }),
      this.prisma.signalement.count({ where }),
    ]);

    return {
      data: signalements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSignalementById(signalementId: string) {
    const signalement = await this.prisma.signalement.findUnique({
      where: { id: signalementId },
      include: {
        rapporteur: {
          select: {
            id: true,
            profil: { select: { prenom: true, nom: true } },
          },
        },
        cibleUser: {
          select: {
            id: true,
            profil: { select: { prenom: true, nom: true } },
          },
        },
        message: { select: { id: true, contenu: true, auteurId: true } },
        document: { select: { id: true, titre: true, uploaderId: true } },
        opportunite: { select: { id: true, titre: true, auteurId: true } },
      },
    });

    if (!signalement) throw new NotFoundException('Signalement introuvable');

    return signalement;
  }

  // ─────────────────────────────────────────
  // MES SIGNALEMENTS
  // ─────────────────────────────────────────

  async getMySignalements(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [signalements, total] = await Promise.all([
      this.prisma.signalement.findMany({
        where: { rapporteurId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          cibleUser: {
            select: {
              id: true,
              profil: { select: { prenom: true, nom: true } },
            },
          },
          message: { select: { id: true, contenu: true } },
          document: { select: { id: true, titre: true } },
          opportunite: { select: { id: true, titre: true } },
        },
      }),
      this.prisma.signalement.count({ where: { rapporteurId: userId } }),
    ]);

    return {
      data: signalements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────
  // MISE À JOUR (ADMIN/DELEGATE)
  // ─────────────────────────────────────────

  async updateSignalement(
    signalementId: string,
    dto: UpdateSignalementDto,
    adminId: string,
  ) {
    const signalement = await this.prisma.signalement.findUnique({
      where: { id: signalementId },
    });
    if (!signalement) throw new NotFoundException('Signalement introuvable');

    return this.prisma.signalement.update({
      where: { id: signalementId },
      data: {
        ...(dto.statut && { statut: dto.statut }),
        ...(dto.statut === 'resolu' && { resoluLe: new Date() }),
      },
    });
  }

  // ─────────────────────────────────────────
  // STATISTIQUES (ADMIN)
  // ─────────────────────────────────────────

  async getStats() {
    const [total, ouverts, enCours, resolus, classes] = await Promise.all([
      this.prisma.signalement.count(),
      this.prisma.signalement.count({ where: { statut: 'ouvert' } }),
      this.prisma.signalement.count({ where: { statut: 'en_cours' } }),
      this.prisma.signalement.count({ where: { statut: 'resolu' } }),
      this.prisma.signalement.count({ where: { statut: 'classe' } }),
    ]);

    return {
      total,
      ouverts,
      enCours,
      resolus,
      classes,
    };
  }
}
