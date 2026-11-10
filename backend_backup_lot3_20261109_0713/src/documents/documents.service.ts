import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CanalAccessService } from '../common/services/canal-access.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private canalAccess: CanalAccessService,
  ) {}

  // ─────────────────────────────────────────
  // LECTURE
  // ─────────────────────────────────────────

  async getDocumentsByCanal(user: any, canalId: string, page: number = 1, limit: number = 20) {
    await this.canalAccess.assertCanAccess(user, canalId);
    page = Math.max(1, page || 1);
    limit = Math.min(Math.max(1, limit || 20), 100);

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          canalId,
          deletedAt: null,
          estPublic: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          uploader: {
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
        },
      }),
      this.prisma.document.count({
        where: { canalId, deletedAt: null, estPublic: true },
      }),
    ]);

    return {
      data: documents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDocumentById(user: any, documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        uploader: {
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
        _count: {
          select: { signalements: true },
        },
      },
    });

    if (!document || document.deletedAt) {
      throw new NotFoundException('Document introuvable');
    }

    if (!document.estPublic) throw new NotFoundException('Document introuvable');

    const isMod = ['delegate', 'admin', 'superadmin'].includes(user.role);
    if (!document.estPublic && !isMod && document.uploaderId !== user.id) {
      throw new NotFoundException('Document introuvable');
    }
    if (document.canalId) {
      await this.canalAccess.assertCanAccess(user, document.canalId);
    }

    // Incrémenter les vues
    await this.prisma.document.update({
      where: { id: documentId },
      data: { nbTelechargements: { increment: 1 } },
    });

    return document;
  }

  async getDocumentsByUser(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          uploaderId: userId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          canal: {
            select: { id: true, nom: true },
          },
        },
      }),
      this.prisma.document.count({
        where: { uploaderId: userId, deletedAt: null },
      }),
    ]);

    return {
      data: documents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchDocuments(query: string, typeFichier?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      estPublic: true,
      AND: [{ OR: [{ canalId: null }, { canal: { estPublic: true, estActif: true } }] }],
      OR: [
        { titre: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (typeFichier) {
      where.typeFichier = typeFichier;
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          uploader: {
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
          canal: {
            select: { id: true, nom: true },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data: documents,
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

  async createDocument(userId: string, dto: CreateDocumentDto) {
    // Vérifier l'accès au canal si spécifié
    if (dto.canalId) {
      const canal = await this.prisma.canal.findUnique({
        where: { id: dto.canalId },
      });
      if (!canal) throw new NotFoundException('Canal introuvable');

      // Vérifier si canal privé
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
    }

    const document = await this.prisma.document.create({
      data: {
        canalId: dto.canalId,
        uploaderId: userId,
        titre: dto.titre,
        description: dto.description,
        typeFichier: dto.typeFichier,
        urlFichier: dto.urlFichier,
        mimeType: dto.mimeType,
        tailleOctets: dto.tailleOctets,
        estPublic: dto.estPublic ?? true,
      },
      include: {
        uploader: {
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

    // RG-06 : +1 au score de réputation
    await this.prisma.profil.updateMany({
      where: { utilisateurId: userId },
      data: { scoreReputation: { increment: 1 } },
    });

    return document;
  }

  async updateDocument(userId: string, documentId: string, dto: UpdateDocumentDto) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document || document.deletedAt) {
      throw new NotFoundException('Document introuvable');
    }

    if (document.uploaderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres documents');
    }

    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        ...(dto.titre && { titre: dto.titre }),
        ...(dto.description && { description: dto.description }),
      },
    });
  }

  async deleteDocument(userId: string, documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document || document.deletedAt) {
      throw new NotFoundException('Document introuvable');
    }

    if (document.uploaderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres documents');
    }

    // Soft delete
    return this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
  }

  // ─────────────────────────────────────────
  // ADMIN / MODÉRATION
  // ─────────────────────────────────────────

  async hideDocument(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException('Document introuvable');

    return this.prisma.document.update({
      where: { id: documentId },
      data: { estPublic: false },
    });
  }

  async unhideDocument(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException('Document introuvable');

    return this.prisma.document.update({
      where: { id: documentId },
      data: { estPublic: true },
    });
  }
}
