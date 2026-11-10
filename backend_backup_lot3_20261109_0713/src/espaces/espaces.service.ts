import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEspaceDto } from './dto/create-espace.dto';
import { UpdateEspaceDto } from './dto/update-espace.dto';

@Injectable()
export class EspacesService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // ESPACES PUBLICS (listes pour inscription)
  // ─────────────────────────────────────────

  async getAllEspaces() {
    return this.prisma.espace.findMany({
      where: { estActif: true, estPublic: true },
      include: {
        universite: { select: { id: true, nom: true } },
        filiere: { select: { id: true, nom: true } },
        _count: {
          select: { membres: true, canaux: true },
        },
      },
      orderBy: { nom: 'asc' },
    });
  }

  async getEspaceById(id: string) {
    const espace = await this.prisma.espace.findUnique({
      where: { id },
      include: {
        universite: { select: { id: true, nom: true, ville: true } },
        filiere: { select: { id: true, nom: true } },
        canaux: {
          where: { estActif: true, estPublic: true },
          orderBy: { nom: 'asc' },
          include: {
            _count: {
              select: { membres: true, messages: true },
            },
          },
        },
        _count: {
          select: { membres: true },
        },
      },
    });

    if (!espace) {
      throw new NotFoundException('Espace introuvable');
    }

    return espace;
  }

  // ─────────────────────────────────────────
  // ESPACES DE L'UTILISATEUR
  // ─────────────────────────────────────────

  async getMyEspaces(userId: string) {
    const membres = await this.prisma.espaceMembre.findMany({
      where: { utilisateurId: userId },
      include: {
        espace: {
          include: {
            universite: { select: { id: true, nom: true } },
            filiere: { select: { id: true, nom: true } },
            _count: {
              select: { canaux: true },
            },
          },
        },
      },
      orderBy: { rejointLe: 'desc' },
    });

    return membres.map((m) => m.espace);
  }

  // ─────────────────────────────────────────
  // REJOINDRE / QUITTER UN ESPACE
  // ─────────────────────────────────────────

  async joinEspace(user: any, espaceId: string) {
    const userId = user.id;
    const espace = await this.prisma.espace.findUnique({
      where: { id: espaceId },
    });
    if (!espace || !espace.estActif) throw new NotFoundException('Espace introuvable');
    if (!espace.estPublic && !['admin', 'superadmin'].includes(user.role)) {
      throw new ForbiddenException('Espace privé - adhésion sur invitation');
    }

    // Vérifier si déjà membre
    const existing = await this.prisma.espaceMembre.findUnique({
      where: {
        espaceId_utilisateurId: {
          espaceId,
          utilisateurId: userId,
        },
      },
    });

    if (existing) {
      throw new ForbiddenException('Vous êtes déjà membre de cet espace');
    }

    return this.prisma.espaceMembre.create({
      data: {
        espaceId,
        utilisateurId: userId,
      },
    });
  }

  async leaveEspace(userId: string, espaceId: string) {
    const membre = await this.prisma.espaceMembre.findUnique({
      where: {
        espaceId_utilisateurId: {
          espaceId,
          utilisateurId: userId,
        },
      },
    });

    if (!membre) {
      throw new NotFoundException('Vous n\'êtes pas membre de cet espace');
    }

    return this.prisma.espaceMembre.delete({
      where: { id: membre.id },
    });
  }

  // ─────────────────────────────────────────
  // ADMIN / DELEGATE : Gestion des espaces
  // ─────────────────────────────────────────

  async createEspace(userId: string, dto: CreateEspaceDto) {
    return this.prisma.espace.create({
      data: {
        nom: dto.nom,
        typeEspace: dto.typeEspace,
        universiteId: dto.universiteId,
        filiereId: dto.filiereId,
        niveau: dto.niveau,
        estPublic: dto.estPublic ?? true,
      },
      include: {
        universite: { select: { id: true, nom: true } },
        filiere: { select: { id: true, nom: true } },
      },
    });
  }

  async updateEspace(espaceId: string, dto: UpdateEspaceDto) {
    const espace = await this.prisma.espace.findUnique({
      where: { id: espaceId },
    });
    if (!espace) throw new NotFoundException('Espace introuvable');

    return this.prisma.espace.update({
      where: { id: espaceId },
      data: {
        ...(dto.nom && { nom: dto.nom }),
        ...(dto.estPublic !== undefined && { estPublic: dto.estPublic }),
        ...(dto.estActif !== undefined && { estActif: dto.estActif }),
      },
    });
  }

  async deleteEspace(espaceId: string) {
    const espace = await this.prisma.espace.findUnique({
      where: { id: espaceId },
    });
    if (!espace) throw new NotFoundException('Espace introuvable');

    // Soft delete
    return this.prisma.espace.update({
      where: { id: espaceId },
      data: { estActif: false },
    });
  }

  // ─────────────────────────────────────────
  // MEMBRES D'UN ESPACE (admin/delegate)
  // ─────────────────────────────────────────

  async getEspaceMembers(espaceId: string) {
    const espace = await this.prisma.espace.findUnique({
      where: { id: espaceId },
    });
    if (!espace) throw new NotFoundException('Espace introuvable');

    const membres = await this.prisma.espaceMembre.findMany({
      where: { espaceId },
      include: {
        utilisateur: {
          select: {
            id: true,
            telephone: true,
            email: true,
            role: true,
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
      orderBy: { rejointLe: 'desc' },
    });

    return membres;
  }
}
