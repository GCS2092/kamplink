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

  // ---------- Lecture ----------
  // estMasque = decision d un moderateur; estPublic = choix de l auteur (document prive)

  async getDocumentsByCanal(user: Actor, canalId: string, page: number = 1, limit: number = 20) {
    await this.canalAccess.assertCanAccess(user, canalId);
    const pg = paginate(page, limit);
    const where = {
      canalId,
      deletedAt: null,
      estMasque: false,
      OR: [{ estPublic: true }, { uploaderId: user.id }],
    };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.limit,
        include: { uploader: UPLOADER },
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
        include: { canal: { select: { id: true, nom: true } } },
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
        },
        include: { uploader: UPLOADER },
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