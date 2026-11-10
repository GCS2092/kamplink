import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CanalAccessService } from '../common/services/canal-access.service';
import { CreateCanalDto } from './dto/create-canal.dto';
import { UpdateCanalDto } from './dto/update-canal.dto';

type Actor = { id: string; role: string };
const GLOBAL_ADMINS = ['admin', 'superadmin'];

@Injectable()
export class CanauxService {
  constructor(
    private prisma: PrismaService,
    private canalAccess: CanalAccessService,
  ) {}

  async getCanauxByEspace(user: Actor, espaceId: string) {
    const espace = await this.prisma.espace.findUnique({ where: { id: espaceId } });
    if (!espace) throw new NotFoundException('Espace introuvable');

    // Canaux prives: visibles seulement par leurs membres et les admins
    const visibilite = GLOBAL_ADMINS.includes(user.role)
      ? {}
      : { OR: [{ estPublic: true }, { membres: { some: { utilisateurId: user.id } } }] };

    return this.prisma.canal.findMany({
      where: { espaceId, estActif: true, ...visibilite },
      orderBy: { nom: 'asc' },
      include: { _count: { select: { membres: true, messages: true } } },
    });
  }

  async getCanalById(user: Actor, canalId: string) {
    await this.canalAccess.assertCanAccess(user, canalId);
    const canal = await this.prisma.canal.findUnique({
      where: { id: canalId },
      include: {
        espace: { select: { id: true, nom: true, universiteId: true, filiereId: true } },
        _count: { select: { membres: true, messages: true } },
      },
    });
    if (!canal) throw new NotFoundException('Canal introuvable');
    return canal;
  }

  async joinCanal(userId: string, canalId: string) {
    const canal = await this.prisma.canal.findUnique({ where: { id: canalId } });
    if (!canal || !canal.estActif) throw new NotFoundException('Canal introuvable');

    const espaceMember = await this.prisma.espaceMembre.findUnique({
      where: { espaceId_utilisateurId: { espaceId: canal.espaceId, utilisateurId: userId } },
    });
    if (!canal.estPublic && !espaceMember) {
      throw new ForbiddenException("Canal privé - accès réservé aux membres de l'espace");
    }

    const existing = await this.prisma.canalMembre.findUnique({
      where: { canalId_utilisateurId: { canalId, utilisateurId: userId } },
    });
    if (existing) throw new ConflictException('Vous êtes déjà membre de ce canal');

    return this.prisma.canalMembre.create({ data: { canalId, utilisateurId: userId } });
  }

  async leaveCanal(userId: string, canalId: string) {
    const membre = await this.prisma.canalMembre.findUnique({
      where: { canalId_utilisateurId: { canalId, utilisateurId: userId } },
    });
    if (!membre) throw new NotFoundException("Vous n'êtes pas membre de ce canal");
    return this.prisma.canalMembre.delete({ where: { id: membre.id } });
  }

  // Admin global, ou delegue membre de l'espace (il devient admin du canal cree)
  async createCanal(user: Actor, dto: CreateCanalDto) {
    const espace = await this.prisma.espace.findUnique({ where: { id: dto.espaceId } });
    if (!espace || !espace.estActif) throw new NotFoundException('Espace introuvable');

    if (!GLOBAL_ADMINS.includes(user.role)) {
      const m = await this.prisma.espaceMembre.findUnique({
        where: { espaceId_utilisateurId: { espaceId: dto.espaceId, utilisateurId: user.id } },
      });
      if (!m) throw new ForbiddenException("Vous devez être membre de l'espace pour y créer un canal");
    }

    return this.prisma.$transaction(async (tx) => {
      const canal = await tx.canal.create({
        data: {
          espaceId: dto.espaceId,
          nom: dto.nom,
          description: dto.description,
          estPublic: dto.estPublic ?? true,
        },
        include: { espace: { select: { id: true, nom: true } } },
      });
      await tx.canalMembre.create({
        data: { canalId: canal.id, utilisateurId: user.id, role: 'admin' },
      });
      return canal;
    });
  }

  async updateCanal(user: Actor, canalId: string, dto: UpdateCanalDto) {
    const canal = await this.prisma.canal.findUnique({ where: { id: canalId } });
    if (!canal) throw new NotFoundException('Canal introuvable');
    await this.canalAccess.assertCanModerate(user, canalId);

    const isAdmin = GLOBAL_ADMINS.includes(user.role);
    return this.prisma.canal.update({
      where: { id: canalId },
      data: {
        ...(dto.nom && { nom: dto.nom }),
        ...(dto.description && { description: dto.description }),
        ...(dto.estPublic !== undefined && { estPublic: dto.estPublic }),
        // Reactiver ou desactiver un canal: admin global seulement
        ...(isAdmin && dto.estActif !== undefined && { estActif: dto.estActif }),
      },
    });
  }

  async deleteCanal(user: Actor, canalId: string) {
    const canal = await this.prisma.canal.findUnique({ where: { id: canalId } });
    if (!canal) throw new NotFoundException('Canal introuvable');
    await this.canalAccess.assertCanAdminCanal(user, canalId);
    return this.prisma.canal.update({ where: { id: canalId }, data: { estActif: false } });
  }

  async getCanalMembers(user: Actor, canalId: string) {
    const canal = await this.prisma.canal.findUnique({ where: { id: canalId } });
    if (!canal) throw new NotFoundException('Canal introuvable');
    await this.canalAccess.assertCanModerate(user, canalId);

    return this.prisma.canalMembre.findMany({
      where: { canalId },
      include: {
        utilisateur: {
          select: { id: true, profil: { select: { prenom: true, nom: true, avatarUrl: true } } },
        },
      },
      orderBy: { rejointLe: 'desc' },
    });
  }

  // Attribuer un role dans le canal (cree l'appartenance si besoin)
  async setMemberRole(user: Actor, canalId: string, targetId: string, role: string) {
    const canal = await this.prisma.canal.findUnique({ where: { id: canalId } });
    if (!canal) throw new NotFoundException('Canal introuvable');
    await this.canalAccess.assertCanAdminCanal(user, canalId);
    if (targetId === user.id && !GLOBAL_ADMINS.includes(user.role)) {
      throw new BadRequestException('Vous ne pouvez pas modifier votre propre rôle');
    }
    const target = await this.prisma.utilisateur.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Utilisateur introuvable');

    return this.prisma.canalMembre.upsert({
      where: { canalId_utilisateurId: { canalId, utilisateurId: targetId } },
      update: { role: role as any, estArchive: false },
      create: { canalId, utilisateurId: targetId, role: role as any },
    });
  }
}