import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CanalAccessService, MODERATOR_ROLES } from '../common/services/canal-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

type Actor = { id: string; role: string };

const TYPES_FICHIER = ['cours', 'exam', 'resume', 'exercice', 'autre'];

const UPLOADER = {
  select: {
    id: true,
    profil: {
      select: { prenom: true, nom: true, avatarUrl: true, statutVerification: true },
    },
  },
};

const CATEGORIES = {
  category: { select: { id: true, nom: true } },
  subcategory: { select: { id: true, nom: true } },
};

function paginate(page: number, limit: number) {
  const p = Math.max(1, Number.isFinite(page) ? page : 1);
  const l = Math.min(Math.max(1, Number.isFinite(limit) ? limit : 20), 100);
  return { page: p, limit: l, skip: (p - 1) * l };
}

function meta(total: number, pg: { page: number; limit: number }) {
  return { total, page: pg.page, limit: pg.limit, totalPages: Math.ceil(total / pg.limit) };
}

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private canalAccess: CanalAccessService,
    private notifications: NotificationsService,
  ) {}

  // Niveau et filiere du profil du lecteur (pour l'acces restreint)
  private async viewerProfile(userId: string) {
    const p = await this.prisma.profil.findUnique({
      where: { utilisateurId: userId },
      select: { niveau: true, filiereId: true },
    });
    return { niveau: p?.niveau ?? null, filiereId: p?.filiereId ?? null };
  }

  // Condition Prisma: document public, ou restreint mais autorise pour ce lecteur
  private restrictionFilter(vp: { niveau: string | null; filiereId: string | null }) {
    const niveauOk: any[] = [{ allowedNiveaux: { isEmpty: true } }];
    if (vp.niveau) niveauOk.push({ allowedNiveaux: { has: vp.niveau as any } });
    const filiereOk: any[] = [{ allowedFiliereIds: { isEmpty: true } }];
    if (vp.filiereId) filiereOk.push({ allowedFiliereIds: { has: vp.filiereId } });
    return {
      OR: [{ accessScope: 'public' as const }, { AND: [{ OR: niveauOk }, { OR: filiereOk }] }],
    };
  }

  private canSeeRestricted(doc: any, vp: { niveau: string | null; filiereId: string | null }): boolean {
    if (doc.accessScope !== 'restricted') return true;
    const niveauOk = !doc.allowedNiveaux?.length || (vp.niveau && doc.allowedNiveaux.includes(vp.niveau));
    const filiereOk =
      !doc.allowedFiliereIds?.length || (vp.filiereId && doc.allowedFiliereIds.includes(vp.filiereId));
    return !!(niveauOk && filiereOk);
  }

  // ---------- Lecture ----------
  // estMasque = decision d'un moderateur; estPublic = choix de l'auteur (document prive)

  async getDocumentsByCanal(
    user: Actor,
    canalId: string,
    page: number = 1,
    limit: number = 20,
    categoryId?: string,
  ) {
    await this.canalAccess.assertCanAccess(user, canalId);
    const pg = paginate(page, limit);
    const vp = await this.viewerProfile(user.id);
    const isMod = await this.canalAccess.canModerate(user, canalId);

    const where: any = {
      canalId,
      deletedAt: null,
      estMasque: false,
      AND: [
        { OR: [{ estPublic: true }, { uploaderId: user.id }] },
        // Les moderateurs et l'auteur voient aussi les documents restreints
        isMod ? {} : { OR: [{ uploaderId: user.id }, this.restrictionFilter(vp)] },
      ],
    };
    if (categoryId) where.categoryId = categoryId;

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.limit,
        include: { uploader: UPLOADER, ...CATEGORIES },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data: documents, meta: meta(total, pg) };
  }

  async getDocumentById(user: Actor, documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        uploader: UPLOADER,
        canal: { select: { id: true, nom: true, espaceId: true } },
        _count: { select: { signalements: true } },
        ...CATEGORIES,
      },
    });
    if (!document || document.deletedAt) throw new NotFoundException('Document introuvable');

    const isMod = MODERATOR_ROLES.includes(user.role);
    const isOwner = document.uploaderId === user.id;
    if ((document.estMasque || !document.estPublic) && !isMod && !isOwner) {
      throw new NotFoundException('Document introuvable');
    }
    if (document.canalId) {
      await this.canalAccess.assertCanAccess(user, document.canalId);
    }
    if (!isOwner && !isMod) {
      const vp = await this.viewerProfile(user.id);
      if (!this.canSeeRestricted(document, vp)) throw new NotFoundException('Document introuvable');
    }

    if (!isOwner) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { nbTelechargements: { increment: 1 } },
      });
    }
    return document;
  }

  async getDocumentsByUser(userId: string, page: number = 1, limit: number = 20) {
    const pg = paginate(page, limit);
    const where = { uploaderId: userId, deletedAt: null };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.limit,
        include: { canal: { select: { id: true, nom: true } }, ...CATEGORIES },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data: documents, meta: meta(total, pg) };
  }

  async searchDocuments(query: string, typeFichier?: string, page: number = 1, limit: number = 20) {
    if (!query || !query.trim()) throw new BadRequestException('Paramètre q requis');
    if (typeFichier && !TYPES_FICHIER.includes(typeFichier)) {
      throw new BadRequestException('Type de fichier invalide');
    }
    const pg = paginate(page, limit);

    const where: any = {
      deletedAt: null,
      estPublic: true,
      estMasque: false,
      accessScope: 'public', // les documents restreints n'apparaissent pas dans la recherche globale
      AND: [{ OR: [{ canalId: null }, { canal: { estPublic: true, estActif: true } }] }],
      OR: [
        { titre: { contains: query.trim(), mode: 'insensitive' } },
        { description: { contains: query.trim(), mode: 'insensitive' } },
      ],
    };
    if (typeFichier) where.typeFichier = typeFichier;

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.limit,
        include: {
          uploader: { select: { id: true, profil: { select: { prenom: true, nom: true, avatarUrl: true } } } },
          canal: { select: { id: true, nom: true } },
          ...CATEGORIES,
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data: documents, meta: meta(total, pg) };
  }

  // ---------- Creation / modification ----------

  async createDocument(user: Actor, dto: CreateDocumentDto) {
    if (dto.canalId) {
      await this.canalAccess.assertCanAccess(user, dto.canalId);
    }

    // Categorie / sous-categorie: actives, et la sous-categorie appartient a la categorie
    if (dto.subcategoryId && !dto.categoryId) {
      throw new BadRequestException('categoryId requis avec subcategoryId');
    }
    if (dto.categoryId) {
      const cat = await this.prisma.documentCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat || !cat.estActive) throw new BadRequestException('Catégorie invalide');
    }
    if (dto.subcategoryId) {
      const sub = await this.prisma.documentSubcategory.findUnique({ where: { id: dto.subcategoryId } });
      if (!sub || !sub.estActive || sub.categoryId !== dto.categoryId) {
        throw new BadRequestException('Sous-catégorie invalide pour cette catégorie');
      }
    }

    // Acces restreint: il faut au moins un critere
    const restricted = dto.accessScope === 'restricted';
    const niveaux = dto.allowedNiveaux ?? [];
    const filieres = dto.allowedFiliereIds ?? [];
    if (restricted && !niveaux.length && !filieres.length) {
      throw new BadRequestException('Un accès restreint exige au moins un niveau ou une filière');
    }
    if (!restricted && (niveaux.length || filieres.length)) {
      throw new BadRequestException('Niveaux et filières exigent accessScope = restricted');
    }
    if (filieres.length) {
      const n = await this.prisma.filiere.count({ where: { id: { in: filieres } } });
      if (n !== new Set(filieres).size) throw new BadRequestException('Filière inconnue');
    }

    // Document + point de reputation (RG-06) dans la meme transaction
    const [document] = await this.prisma.$transaction([
      this.prisma.document.create({
        data: {
          canalId: dto.canalId,
          uploaderId: user.id,
          titre: dto.titre,
          description: dto.description,
          typeFichier: dto.typeFichier,
          urlFichier: dto.urlFichier,
          mimeType: dto.mimeType,
          tailleOctets: dto.tailleOctets,
          estPublic: dto.estPublic ?? true,
          categoryId: dto.categoryId,
          subcategoryId: dto.subcategoryId,
          accessScope: restricted ? 'restricted' : 'public',
          allowedNiveaux: niveaux as any,
          allowedFiliereIds: filieres,
        },
        include: { uploader: UPLOADER, ...CATEGORIES },
      }),
      this.prisma.profil.updateMany({
        where: { utilisateurId: user.id },
        data: { scoreReputation: { increment: 1 } },
      }),
    ]);

    return document;
  }

  async updateDocument(userId: string, documentId: string, dto: UpdateDocumentDto) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.deletedAt) throw new NotFoundException('Document introuvable');
    if (document.uploaderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres documents');
    }

    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        ...(dto.titre && { titre: dto.titre }),
        ...(dto.description && { description: dto.description }),
        ...(dto.estPublic !== undefined && { estPublic: dto.estPublic }),
      },
    });
  }

  async deleteDocument(userId: string, documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.deletedAt) throw new NotFoundException('Document introuvable');
    if (document.uploaderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres documents');
    }

    return this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
  }

  // ---------- Moderation ----------

  async hideDocument(user: Actor, documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.deletedAt) throw new NotFoundException('Document introuvable');
    await this.canalAccess.assertCanModerate(user, document.canalId);

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: { estMasque: true },
    });
    this.notifications.notifySafe(
      document.uploaderId,
      'moderation',
      'Document masqué',
      `Votre document « ${document.titre} » a été masqué par la modération.`,
      { documentId },
    );
    return updated;
  }

  async unhideDocument(user: Actor, documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.deletedAt) throw new NotFoundException('Document introuvable');
    await this.canalAccess.assertCanModerate(user, document.canalId);

    return this.prisma.document.update({
      where: { id: documentId },
      data: { estMasque: false },
    });
  }
}