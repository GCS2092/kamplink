import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { UpdateSignalementDto } from './dto/update-signalement.dto';

type Actor = { id: string; role: string };

function pg(page: number, limit: number) {
  const p = Math.max(1, page || 1);
  const l = Math.min(Math.max(1, limit || 20), 100);
  return { p, l, skip: (p - 1) * l };
}

@Injectable()
export class SignalementsService {
  constructor(private prisma: PrismaService) {}

  // Un delegue ne voit que les signalements des canaux ou il est admin/moderateur
  private async scopeFor(actor: Actor): Promise<any> {
    if (['admin', 'superadmin'].includes(actor.role)) return {};
    const canaux = await this.prisma.canalMembre.findMany({
      where: { utilisateurId: actor.id, role: { in: ['admin', 'moderateur'] }, estArchive: false },
      select: { canalId: true },
    });
    const ids = canaux.map((c) => c.canalId);
    return {
      OR: [{ message: { canalId: { in: ids } } }, { document: { canalId: { in: ids } } }],
    };
  }

  async createSignalement(userId: string, dto: CreateSignalementDto) {
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
        rapporteur: { select: { id: true, profil: { select: { prenom: true, nom: true } } } },
      },
    });
  }

  async getAllSignalements(actor: Actor, statut?: string, page: number = 1, limit: number = 20) {
    const { p, l, skip } = pg(page, limit);
    const where: any = { ...(await this.scopeFor(actor)) };
    if (statut) where.statut = statut;

    const [signalements, total] = await Promise.all([
      this.prisma.signalement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
        include: {
          rapporteur: { select: { id: true, profil: { select: { prenom: true, nom: true } } } },
          cibleUser: { select: { id: true, profil: { select: { prenom: true, nom: true } } } },
          message: { select: { id: true, contenu: true } },
          document: { select: { id: true, titre: true } },
          opportunite: { select: { id: true, titre: true } },
        },
      }),
      this.prisma.signalement.count({ where }),
    ]);
    return { data: signalements, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async getSignalementById(actor: Actor, signalementId: string) {
    const signalement = await this.prisma.signalement.findFirst({
      where: { id: signalementId, ...(await this.scopeFor(actor)) },
      include: {
        rapporteur: { select: { id: true, profil: { select: { prenom: true, nom: true } } } },
        cibleUser: { select: { id: true, profil: { select: { prenom: true, nom: true } } } },
        message: { select: { id: true, contenu: true, auteurId: true } },
        document: { select: { id: true, titre: true, uploaderId: true } },
        opportunite: { select: { id: true, titre: true, auteurId: true } },
      },
    });
    if (!signalement) throw new NotFoundException('Signalement introuvable');
    return signalement;
  }

  async getMySignalements(userId: string, page: number = 1, limit: number = 20) {
    const { p, l, skip } = pg(page, limit);
    const where = { rapporteurId: userId };
    const [signalements, total] = await Promise.all([
      this.prisma.signalement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
        include: {
          cibleUser: { select: { id: true, profil: { select: { prenom: true, nom: true } } } },
          message: { select: { id: true, contenu: true } },
          document: { select: { id: true, titre: true } },
          opportunite: { select: { id: true, titre: true } },
        },
      }),
      this.prisma.signalement.count({ where }),
    ]);
    return { data: signalements, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async updateSignalement(signalementId: string, dto: UpdateSignalementDto, adminId: string, actorRole: string) {
    const signalement = await this.prisma.signalement.findFirst({
      where: { id: signalementId, ...(await this.scopeFor({ id: adminId, role: actorRole })) },
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

  async getStats() {
    const [total, ouverts, enCours, resolus, classes] = await Promise.all([
      this.prisma.signalement.count(),
      this.prisma.signalement.count({ where: { statut: 'ouvert' } }),
      this.prisma.signalement.count({ where: { statut: 'en_cours' } }),
      this.prisma.signalement.count({ where: { statut: 'resolu' } }),
      this.prisma.signalement.count({ where: { statut: 'classe' } }),
    ]);
    return { total, ouverts, enCours, resolus, classes };
  }
}