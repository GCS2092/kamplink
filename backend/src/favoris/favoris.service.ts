import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CanalAccessService } from '../common/services/canal-access.service';
import { AddFavoriDto } from './dto/favori.dto';

type Actor = { id: string; role: string };
const TYPES = ['opportunite', 'message', 'document'];

@Injectable()
export class FavorisService {
  constructor(
    private prisma: PrismaService,
    private canalAccess: CanalAccessService,
  ) {}

  // On ne peut mettre en favori que ce qu'on a le droit de voir
  private async assertVisible(user: Actor, type: string, id: string) {
    if (type === 'opportunite') {
      const o = await this.prisma.opportunite.findUnique({ where: { id } });
      if (!o || o.deletedAt || o.estMasque || !o.estActive) {
        throw new NotFoundException('Ressource introuvable');
      }
    } else if (type === 'message') {
      const m = await this.prisma.message.findUnique({ where: { id } });
      if (!m || m.deletedAt || m.estMasque) throw new NotFoundException('Ressource introuvable');
      await this.canalAccess.assertCanAccess(user, m.canalId);
    } else if (type === 'document') {
      const d = await this.prisma.document.findUnique({ where: { id } });
      if (!d || d.deletedAt || d.estMasque || (!d.estPublic && d.uploaderId !== user.id)) {
        throw new NotFoundException('Ressource introuvable');
      }
      if (d.canalId) await this.canalAccess.assertCanAccess(user, d.canalId);
    } else {
      throw new BadRequestException('Type invalide');
    }
  }

  async add(user: Actor, dto: AddFavoriDto) {
    await this.assertVisible(user, dto.type, dto.ressourceId);
    return this.prisma.favori.upsert({
      where: {
        utilisateurId_type_ressourceId: {
          utilisateurId: user.id,
          type: dto.type as any,
          ressourceId: dto.ressourceId,
        },
      },
      update: {},
      create: { utilisateurId: user.id, type: dto.type as any, ressourceId: dto.ressourceId },
    });
  }

  async remove(userId: string, type: string, ressourceId: string) {
    if (!TYPES.includes(type)) throw new BadRequestException('Type invalide');
    await this.prisma.favori.deleteMany({
      where: { utilisateurId: userId, type: type as any, ressourceId },
    });
    return { message: 'Favori retiré' };
  }

  async list(user: Actor, type?: string, page = 1, limit = 20) {
    if (type && !TYPES.includes(type)) throw new BadRequestException('Type invalide');
    const p = Math.max(1, page || 1);
    const l = Math.min(Math.max(1, limit || 20), 100);
    const where = { utilisateurId: user.id, ...(type ? { type: type as any } : {}) };

    const [rows, total] = await Promise.all([
      this.prisma.favori.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      this.prisma.favori.count({ where }),
    ]);

    const ids = (t: string) => rows.filter((r) => r.type === t).map((r) => r.ressourceId);
    const [opps, docs] = await Promise.all([
      this.prisma.opportunite.findMany({
        where: { id: { in: ids('opportunite') }, deletedAt: null, estMasque: false },
        select: { id: true, titre: true, entreprise: true, typeOffre: true, dateLimite: true },
      }),
      this.prisma.document.findMany({
        where: {
          id: { in: ids('document') },
          deletedAt: null,
          estMasque: false,
          OR: [{ estPublic: true }, { uploaderId: user.id }],
        },
        select: { id: true, titre: true, typeFichier: true },
      }),
    ]);
    const oppMap = new Map(opps.map((o) => [o.id, o]));
    const docMap = new Map(docs.map((d) => [d.id, d]));

    // Les messages ne sont pas detailles ici (controle d'acces canal par canal): id seulement
    const data = rows.map((r) => ({
      ...r,
      ressource:
        r.type === 'opportunite'
          ? (oppMap.get(r.ressourceId) ?? null)
          : r.type === 'document'
            ? (docMap.get(r.ressourceId) ?? null)
            : null,
    }));

    return { data, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }
}