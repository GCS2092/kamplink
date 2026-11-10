import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SanitizationService } from '../common/services/sanitization.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApplyDto } from './dto/candidature.dto';

type Actor = { id: string; role: string };
const ADMINS = ['admin', 'superadmin'];

function paginate(page: number, limit: number) {
  const p = Math.max(1, page || 1);
  const l = Math.min(Math.max(1, limit || 20), 100);
  return { p, l, skip: (p - 1) * l };
}

@Injectable()
export class CandidaturesService {
  constructor(
    private prisma: PrismaService,
    private sanitization: SanitizationService,
    private notifications: NotificationsService,
  ) {}

  async apply(user: Actor, opportuniteId: string, dto: ApplyDto) {
    const opp = await this.prisma.opportunite.findUnique({ where: { id: opportuniteId } });
    if (!opp || opp.deletedAt || opp.estMasque || !opp.estActive || opp.estExpiree) {
      throw new NotFoundException('Opportunité introuvable ou fermée');
    }
    if (opp.dateLimite && opp.dateLimite < new Date()) {
      throw new BadRequestException('La date limite est dépassée');
    }
    if (opp.auteurId === user.id) {
      throw new ForbiddenException('Vous ne pouvez pas candidater à votre propre opportunité');
    }

    // CV: celui fourni, sinon celui du profil
    const profil = await this.prisma.profil.findUnique({ where: { utilisateurId: user.id } });
    const cvUrl = dto.cvUrl ?? profil?.cvUrl ?? null;
    const lettre = dto.lettreMotivation
      ? this.sanitization.sanitizePlainText(dto.lettreMotivation)
      : null;

    const existing = await this.prisma.candidature.findUnique({
      where: { opportuniteId_candidatId: { opportuniteId, candidatId: user.id } },
    });
    if (existing && existing.statut !== 'retiree') {
      throw new ConflictException('Vous avez déjà candidaté à cette opportunité');
    }

    const candidature = existing
      ? await this.prisma.candidature.update({
          where: { id: existing.id },
          data: { statut: 'envoyee', cvUrl, lettreMotivation: lettre },
        })
      : await this.prisma.candidature.create({
          data: { opportuniteId, candidatId: user.id, cvUrl, lettreMotivation: lettre },
        });

    this.notifications.notifySafe(
      opp.auteurId,
      'opportunite',
      'Nouvelle candidature',
      `Une candidature a été reçue pour « ${opp.titre} ».`,
      { opportuniteId, candidatureId: candidature.id },
    );
    return candidature;
  }

  async listForOpportunite(user: Actor, opportuniteId: string, page = 1, limit = 20) {
    const opp = await this.prisma.opportunite.findUnique({ where: { id: opportuniteId } });
    if (!opp || opp.deletedAt) throw new NotFoundException('Opportunité introuvable');
    if (opp.auteurId !== user.id && !ADMINS.includes(user.role)) {
      throw new ForbiddenException('Réservé à l\'auteur de l\'opportunité');
    }
    const { p, l, skip } = paginate(page, limit);
    const where = { opportuniteId, statut: { not: 'retiree' as const } };

    const [data, total] = await Promise.all([
      this.prisma.candidature.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
        include: {
          candidat: {
            select: {
              id: true,
              profil: {
                select: { prenom: true, nom: true, avatarUrl: true, niveau: true, statutVerification: true },
              },
            },
          },
        },
      }),
      this.prisma.candidature.count({ where }),
    ]);
    return { data, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async mine(user: Actor, page = 1, limit = 20) {
    const { p, l, skip } = paginate(page, limit);
    const where = { candidatId: user.id };
    const [data, total] = await Promise.all([
      this.prisma.candidature.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
        include: {
          opportunite: { select: { id: true, titre: true, entreprise: true, typeOffre: true, dateLimite: true } },
        },
      }),
      this.prisma.candidature.count({ where }),
    ]);
    return { data, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async setStatut(user: Actor, id: string, statut: 'vue' | 'acceptee' | 'refusee') {
    const c = await this.prisma.candidature.findUnique({
      where: { id },
      include: { opportunite: { select: { auteurId: true, titre: true } } },
    });
    if (!c) throw new NotFoundException('Candidature introuvable');
    if (c.opportunite.auteurId !== user.id && !ADMINS.includes(user.role)) {
      throw new ForbiddenException('Réservé à l\'auteur de l\'opportunité');
    }
    if (c.statut === 'retiree') throw new ConflictException('Candidature retirée par le candidat');

    const updated = await this.prisma.candidature.update({ where: { id }, data: { statut } });

    if (statut === 'acceptee' || statut === 'refusee') {
      this.notifications.notifySafe(
        c.candidatId,
        'opportunite',
        statut === 'acceptee' ? 'Candidature acceptée' : 'Candidature refusée',
        `Votre candidature pour « ${c.opportunite.titre} » a été ${statut === 'acceptee' ? 'acceptée' : 'refusée'}.`,
        { opportuniteId: c.opportuniteId, candidatureId: id },
      );
    }
    return updated;
  }

  async withdraw(user: Actor, id: string) {
    const c = await this.prisma.candidature.findUnique({ where: { id } });
    if (!c || c.candidatId !== user.id) throw new NotFoundException('Candidature introuvable');
    if (c.statut === 'acceptee') throw new ConflictException('Candidature déjà acceptée');
    return this.prisma.candidature.update({ where: { id }, data: { statut: 'retiree' } });
  }
}