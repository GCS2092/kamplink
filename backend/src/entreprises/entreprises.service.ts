import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEntrepriseDto, UpdateEntrepriseDto } from './dto/entreprise.dto';

type Actor = { id: string; role: string };

const PUBLIC_SELECT = {
  id: true,
  nom: true,
  description: true,
  siteWeb: true,
  logoUrl: true,
  adresse: true,
};

function pg(page: number, limit: number) {
  const p = Math.max(1, page || 1);
  const l = Math.min(Math.max(1, limit || 20), 100);
  return { p, l, skip: (p - 1) * l };
}

@Injectable()
export class EntreprisesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ---------- Representant ----------

  async create(user: Actor, dto: CreateEntrepriseDto) {
    const existing = await this.prisma.entreprise.findUnique({ where: { representantId: user.id } });
    if (existing) throw new ConflictException('Vous avez déjà une entreprise enregistrée');

    // Les doublons d'email ou de SIRET (P2002) deviennent un 409 via le filtre global
    const entreprise = await this.prisma.entreprise.create({
      data: {
        nom: dto.nom.trim(),
        description: dto.description,
        emailContact: dto.emailContact.trim().toLowerCase(),
        telephone: dto.telephone,
        siteWeb: dto.siteWeb,
        adresse: dto.adresse,
        siret: dto.siret,
        logoUrl: dto.logoUrl,
        documentVerif: dto.documentVerif,
        representantId: user.id,
      },
    });

    const admins = await this.prisma.utilisateur.findMany({
      where: { role: { in: ['admin', 'superadmin'] }, estBanni: false },
      select: { id: true },
      take: 50,
    });
    for (const a of admins) {
      this.notifications.notifySafe(
        a.id,
        'systeme',
        'Nouvelle entreprise à valider',
        `L'entreprise « ${entreprise.nom} » attend une validation.`,
        { entrepriseId: entreprise.id },
      );
    }
    return entreprise;
  }

  async me(user: Actor) {
    const e = await this.prisma.entreprise.findUnique({ where: { representantId: user.id } });
    if (!e) throw new NotFoundException('Aucune entreprise enregistrée');
    return e;
  }

  async updateMe(user: Actor, dto: UpdateEntrepriseDto) {
    const e = await this.prisma.entreprise.findUnique({ where: { representantId: user.id } });
    if (!e) throw new NotFoundException('Aucune entreprise enregistrée');
    if (e.statut === 'suspended') throw new ForbiddenException('Entreprise suspendue');

    const data: any = {
      ...(dto.nom && { nom: dto.nom.trim() }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.emailContact && { emailContact: dto.emailContact.trim().toLowerCase() }),
      ...(dto.telephone !== undefined && { telephone: dto.telephone }),
      ...(dto.siteWeb !== undefined && { siteWeb: dto.siteWeb }),
      ...(dto.adresse !== undefined && { adresse: dto.adresse }),
      ...(dto.siret !== undefined && { siret: dto.siret }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.documentVerif !== undefined && { documentVerif: dto.documentVerif }),
    };
    // Une demande rejetee corrigee repart en validation
    if (e.statut === 'rejected') {
      data.statut = 'pending';
      data.commentaireAdmin = null;
    }
    return this.prisma.entreprise.update({ where: { id: e.id }, data });
  }

  // ---------- Lecture publique (utilisateurs connectes) ----------

  async listActives(q?: string, page = 1, limit = 20) {
    const { p, l, skip } = pg(page, limit);
    const where: any = { statut: 'active' };
    if (q && q.trim()) where.nom = { contains: q.trim(), mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.entreprise.findMany({
        where,
        orderBy: { nom: 'asc' },
        skip,
        take: l,
        select: PUBLIC_SELECT,
      }),
      this.prisma.entreprise.count({ where }),
    ]);
    return { data, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async getActive(id: string) {
    const e = await this.prisma.entreprise.findFirst({
      where: { id, statut: 'active' },
      select: PUBLIC_SELECT,
    });
    if (!e) throw new NotFoundException('Entreprise introuvable');
    return e;
  }

  // ---------- Administration ----------

  async adminList(statut?: string, page = 1, limit = 20) {
    const { p, l, skip } = pg(page, limit);
    const where: any = {};
    if (statut) {
      if (!['pending', 'active', 'suspended', 'rejected'].includes(statut)) {
        throw new BadRequestException('Statut invalide');
      }
      where.statut = statut;
    }
    const [data, total] = await Promise.all([
      this.prisma.entreprise.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: l,
        include: {
          representant: {
            select: {
              id: true,
              telephone: true,
              role: true,
              profil: { select: { prenom: true, nom: true } },
            },
          },
        },
      }),
      this.prisma.entreprise.count({ where }),
    ]);
    return { data, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  async decide(
    id: string,
    admin: Actor,
    action: 'approve' | 'reject' | 'suspend',
    commentaire?: string,
  ) {
    const e = await this.prisma.entreprise.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Entreprise introuvable');

    if (action === 'approve' && e.statut === 'active') throw new ConflictException('Déjà active');
    if (action === 'reject') {
      if (e.statut !== 'pending') throw new ConflictException('Seule une demande en attente peut être rejetée');
      if (!commentaire || !commentaire.trim()) throw new BadRequestException('Un motif est requis');
    }
    if (action === 'suspend' && e.statut !== 'active') {
      throw new ConflictException('Seule une entreprise active peut être suspendue');
    }

    const statut = action === 'approve' ? 'active' : action === 'reject' ? 'rejected' : 'suspended';
    const ops: any[] = [
      this.prisma.entreprise.update({
        where: { id },
        data: {
          statut,
          commentaireAdmin: action === 'approve' ? null : commentaire?.trim() || null,
          verifiedAt: action === 'approve' ? new Date() : e.verifiedAt,
          verifiedBy: action === 'approve' ? admin.id : e.verifiedBy,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          utilisateurId: admin.id,
          action: `ENTREPRISE_${action.toUpperCase()}`,
          ressource: 'entreprise',
          ressourceId: id,
          metadata: { commentaire: commentaire ?? null },
        },
      }),
    ];
    // Role company: donne a l'approbation (seulement a un etudiant), retire sinon
    if (e.representantId) {
      if (action === 'approve') {
        ops.push(
          this.prisma.utilisateur.updateMany({
            where: { id: e.representantId, role: 'student' },
            data: { role: 'company' },
          }),
        );
      } else {
        ops.push(
          this.prisma.utilisateur.updateMany({
            where: { id: e.representantId, role: 'company' },
            data: { role: 'student' },
          }),
        );
      }
    }
    const results: any[] = await this.prisma.$transaction(ops);

    if (e.representantId) {
      const titre =
        action === 'approve' ? 'Entreprise validée' : action === 'reject' ? 'Entreprise refusée' : 'Entreprise suspendue';
      const corps =
        action === 'approve'
          ? `Votre entreprise « ${e.nom} » a été validée.`
          : `Votre entreprise « ${e.nom} » : ${commentaire?.trim() || 'décision de la modération'}.`;
      this.notifications.notifySafe(e.representantId, 'moderation', titre, corps, { entrepriseId: id });
    }
    return results[0];
  }
}