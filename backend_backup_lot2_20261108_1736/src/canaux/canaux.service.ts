import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCanalDto } from './dto/create-canal.dto';
import { UpdateCanalDto } from './dto/update-canal.dto';

@Injectable()
export class CanauxService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // CANAUX D'UN ESPACE (lecture)
  // ─────────────────────────────────────────

  async getCanauxByEspace(espaceId: string) {
    const espace = await this.prisma.espace.findUnique({
      where: { id: espaceId },
    });
    if (!espace) throw new NotFoundException('Espace introuvable');

    return this.prisma.canal.findMany({
      where: { espaceId, estActif: true },
      orderBy: { nom: 'asc' },
      include: {
        _count: {
          select: { membres: true, messages: true },
        },
      },
    });
  }

  async getCanalById(canalId: string) {
    const canal = await this.prisma.canal.findUnique({
      where: { id: canalId },
      include: {
        espace: {
          select: {
            id: true,
            nom: true,
            universiteId: true,
            filiereId: true,
          },
        },
        _count: {
          select: { membres: true, messages: true },
        },
      },
    });

    if (!canal) throw new NotFoundException('Canal introuvable');

    return canal;
  }

  // ─────────────────────────────────────────
  // REJOINDRE / QUITTER UN CANAL
  // ─────────────────────────────────────────

  async joinCanal(userId: string, canalId: string) {
    const canal = await this.prisma.canal.findUnique({
      where: { id: canalId },
    });
    if (!canal) throw new NotFoundException('Canal introuvable');

    // Vérifier que l'utilisateur est membre de l'espace parent
    const espaceMember = await this.prisma.espaceMembre.findUnique({
      where: {
        espaceId_utilisateurId: {
          espaceId: canal.espaceId,
          utilisateurId: userId,
        },
      },
    });

    if (!canal.estPublic && !espaceMember) {
      throw new ForbiddenException('Canal privé - accès réservé aux membres de l\'espace');
    }

    const existing = await this.prisma.canalMembre.findUnique({
      where: {
        canalId_utilisateurId: {
          canalId,
          utilisateurId: userId,
        },
      },
    });

    if (existing) {
      throw new ForbiddenException('Vous êtes déjà membre de ce canal');
    }

    return this.prisma.canalMembre.create({
      data: {
        canalId,
        utilisateurId: userId,
      },
    });
  }

  async leaveCanal(userId: string, canalId: string) {
    const membre = await this.prisma.canalMembre.findUnique({
      where: {
        canalId_utilisateurId: {
          canalId,
          utilisateurId: userId,
        },
      },
    });

    if (!membre) {
      throw new NotFoundException('Vous n\'êtes pas membre de ce canal');
    }

    return this.prisma.canalMembre.delete({
      where: { id: membre.id },
    });
  }

  // ─────────────────────────────────────────
  // GESTION ADMIN / DELEGATE
  // ─────────────────────────────────────────

  async createCanal(userId: string, dto: CreateCanalDto) {
    const espace = await this.prisma.espace.findUnique({
      where: { id: dto.espaceId },
    });
    if (!espace) throw new NotFoundException('Espace introuvable');

    return this.prisma.canal.create({
      data: {
        espaceId: dto.espaceId,
        nom: dto.nom,
        description: dto.description,
        estPublic: dto.estPublic ?? true,
      },
      include: {
        espace: { select: { id: true, nom: true } },
      },
    });
  }

  async updateCanal(canalId: string, dto: UpdateCanalDto) {
    const canal = await this.prisma.canal.findUnique({
      where: { id: canalId },
    });
    if (!canal) throw new NotFoundException('Canal introuvable');

    return this.prisma.canal.update({
      where: { id: canalId },
      data: {
        ...(dto.nom && { nom: dto.nom }),
        ...(dto.description && { description: dto.description }),
        ...(dto.estPublic !== undefined && { estPublic: dto.estPublic }),
        ...(dto.estActif !== undefined && { estActif: dto.estActif }),
      },
    });
  }

  async deleteCanal(canalId: string) {
    const canal = await this.prisma.canal.findUnique({
      where: { id: canalId },
    });
    if (!canal) throw new NotFoundException('Canal introuvable');

    return this.prisma.canal.update({
      where: { id: canalId },
      data: { estActif: false },
    });
  }

  // ─────────────────────────────────────────
  // MEMBRES D'UN CANAL
  // ─────────────────────────────────────────

  async getCanalMembers(canalId: string) {
    const canal = await this.prisma.canal.findUnique({
      where: { id: canalId },
    });
    if (!canal) throw new NotFoundException('Canal introuvable');

    return this.prisma.canalMembre.findMany({
      where: { canalId },
      include: {
        utilisateur: {
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
      orderBy: { rejointLe: 'desc' },
    });
  }
}
