import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SubmitVerificationDto } from './dto/submit-verification.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // PROFIL
  // ─────────────────────────────────────────

  // Crée le profil académique d'un utilisateur (après première connexion)
  async createProfile(userId: string, dto: CreateProfileDto) {
    // Vérifie que le profil n'existe pas déjà
    const existing = await this.prisma.profil.findUnique({
      where: { utilisateurId: userId },
    });
    if (existing) {
      throw new ConflictException('Profil déjà existant');
    }

    // Vérifie que l'université existe
    const universite = await this.prisma.universite.findUnique({
      where: { id: dto.universiteId },
    });
    if (!universite) {
      throw new NotFoundException('Université introuvable');
    }

    // Vérifie que la filière appartient bien à cette université
    const filiere = await this.prisma.filiere.findFirst({
      where: { id: dto.filiereId, universiteId: dto.universiteId },
    });
    if (!filiere) {
      throw new NotFoundException('Filière introuvable pour cette université');
    }

    return this.prisma.profil.create({
      data: {
        utilisateurId: userId,
        prenom: dto.prenom,
        nom: dto.nom,
        niveau: dto.niveau,
        universiteId: dto.universiteId,
        filiereId: dto.filiereId,
      },
      include: {
        universite: true,
        filiere: true,
      },
    });
  }

  // Récupère le profil complet d'un utilisateur
  async getProfile(userId: string) {
    const profil = await this.prisma.profil.findUnique({
      where: { utilisateurId: userId },
      include: {
        universite: true,
        filiere: true,
        utilisateur: {
          select: {
            id: true,
            telephone: true,
            email: true,
            role: true,
            estActif: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profil) {
      throw new NotFoundException('Profil introuvable');
    }

    return profil;
  }

  // Récupère le profil public d'un autre utilisateur
  async getPublicProfile(userId: string) {
    const profil = await this.prisma.profil.findUnique({
      where: { utilisateurId: userId },
      select: {
        prenom: true,
        nom: true,
        avatarUrl: true,
        niveau: true,
        scoreReputation: true,
        statutVerification: true,
        universite: { select: { nom: true, ville: true } },
        filiere: { select: { nom: true } },
      },
    });

    if (!profil) {
      throw new NotFoundException('Profil introuvable');
    }

    return profil;
  }

  // Met à jour le profil (RG-12 : modification profil académique)
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Si on change d'université, vérifier que la filière correspond
    if (dto.universiteId && dto.filiereId) {
      const filiere = await this.prisma.filiere.findFirst({
        where: { id: dto.filiereId, universiteId: dto.universiteId },
      });
      if (!filiere) {
        throw new BadRequestException('Filière incompatible avec cette université');
      }
    }

    return this.prisma.profil.update({
      where: { utilisateurId: userId },
      data: {
        ...(dto.prenom && { prenom: dto.prenom }),
        ...(dto.nom && { nom: dto.nom }),
        ...(dto.niveau && { niveau: dto.niveau }),
        ...(dto.universiteId && { universiteId: dto.universiteId }),
        ...(dto.filiereId && { filiereId: dto.filiereId }),
        ...(dto.avatarUrl && { avatarUrl: dto.avatarUrl }),
      },
      include: {
        universite: true,
        filiere: true,
      },
    });
  }

  // ─────────────────────────────────────────
  // VÉRIFICATION CARTE ÉTUDIANTE
  // RG-02 : non vérifié = lecture seule
  // RG-03 : vérification manuelle par admin
  // ─────────────────────────────────────────

  // Soumet une demande de vérification (UC-03)
  async submitVerification(userId: string, dto: SubmitVerificationDto) {
    // Vérifie qu'il n'y a pas déjà une demande en attente ou validée
    const existing = await this.prisma.verification.findUnique({
      where: { utilisateurId: userId },
    });

    if (existing) {
      if (existing.statut === 'verified') {
        throw new ConflictException('Compte déjà vérifié');
      }
      if (existing.statut === 'pending') {
        throw new ConflictException('Une demande est déjà en attente');
      }
      // Si rejeté → on permet de resoumettre en mettant à jour
      return this.prisma.verification.update({
        where: { utilisateurId: userId },
        data: {
          photoCarteUrl: dto.photoCarteUrl,
          statut: 'pending',
          soumisLe: new Date(),
          decideLe: null,
          adminId: null,
          motifRejet: null,
        },
      });
    }

    // Première soumission
    return this.prisma.verification.create({
      data: {
        utilisateurId: userId,
        photoCarteUrl: dto.photoCarteUrl,
        statut: 'pending',
      },
    });
  }

  // Récupère le statut de vérification de l'utilisateur connecté
  async getVerificationStatus(userId: string) {
    const verification = await this.prisma.verification.findUnique({
      where: { utilisateurId: userId },
      select: {
        statut: true,
        soumisLe: true,
        decideLe: true,
        motifRejet: true,
      },
    });

    if (!verification) {
      return { statut: 'non_soumis' };
    }

    return verification;
  }

  // ─────────────────────────────────────────
  // SCORE DE RÉPUTATION
  // RG-06 : +1 par document partagé
  //         +1 par vote positif reçu
  // ─────────────────────────────────────────

  async incrementScore(userId: string, points: number = 1) {
    return this.prisma.profil.update({
      where: { utilisateurId: userId },
      data: {
        scoreReputation: { increment: points },
      },
    });
  }

  // ─────────────────────────────────────────
  // UNIVERSITÉS & FILIÈRES (listes publiques)
  // ─────────────────────────────────────────

  // Liste toutes les universités actives (pour le formulaire d'inscription)
  async getUniversites() {
    return this.prisma.universite.findMany({
      where: { estActif: true },
      orderBy: { nom: 'asc' },
    });
  }

  // Liste les filières d'une université
  async getFilieresByUniversite(universiteId: string) {
    return this.prisma.filiere.findMany({
      where: {
        universiteId,
        estActif: true,
      },
      orderBy: { nom: 'asc' },
    });
  }

  // ─────────────────────────────────────────
  // ADMIN — Gestion des vérifications
  // UC-23 : Valider ou rejeter
  // RG-09 : tracé dans audit_logs
  // ─────────────────────────────────────────

  // Liste toutes les demandes en attente
  async getPendingVerifications() {
    return this.prisma.verification.findMany({
      where: { statut: 'pending' },
      include: {
        utilisateur: {
          include: { profil: true },
        },
      },
      orderBy: { soumisLe: 'asc' },
    });
  }

  // Approuve une vérification
  async approveVerification(verificationId: string, adminId: string) {
    const verif = await this.prisma.verification.findUnique({
      where: { id: verificationId },
    });
    if (!verif) throw new NotFoundException('Vérification introuvable');
    if (verif.statut !== 'pending') throw new ConflictException('Demande déjà traitée');

    // Met à jour la vérification
    const updated = await this.prisma.verification.update({
      where: { id: verificationId },
      data: {
        statut: 'verified',
        decideLe: new Date(),
        adminId,
      },
    });

    // Met à jour le profil de l'étudiant
    await this.prisma.profil.updateMany({
      where: { utilisateurId: verif.utilisateurId },
      data: {
        statutVerification: 'verified',
        verifiele: new Date(),
      },
    });

    // Trace dans audit_logs (RG-09)
    await this.prisma.auditLog.create({
      data: {
        utilisateurId: adminId,
        action: 'APPROVE_VERIFICATION',
        ressource: 'verification',
        ressourceId: verificationId,
      },
    });

    return updated;
  }

  // Rejette une vérification avec motif
  async rejectVerification(
    verificationId: string,
    adminId: string,
    motifRejet: string,
  ) {
    const verif = await this.prisma.verification.findUnique({
      where: { id: verificationId },
    });
    if (!verif) throw new NotFoundException('Vérification introuvable');
    if (verif.statut !== 'pending') throw new ConflictException('Demande déjà traitée');

    const updated = await this.prisma.verification.update({
      where: { id: verificationId },
      data: {
        statut: 'rejected',
        decideLe: new Date(),
        adminId,
        motifRejet,
      },
    });

    // Met à jour le profil
    await this.prisma.profil.updateMany({
      where: { utilisateurId: verif.utilisateurId },
      data: { statutVerification: 'rejected' },
    });

    // Trace dans audit_logs
    await this.prisma.auditLog.create({
      data: {
        utilisateurId: adminId,
        action: 'REJECT_VERIFICATION',
        ressource: 'verification',
        ressourceId: verificationId,
        metadata: { motifRejet },
      },
    });

    return updated;
  }

  // ─────────────────────────────────────────
  // ADMIN — Suspendre / Bannir un compte
  // UC-24
  // ─────────────────────────────────────────

  private readonly ROLE_RANK: Record<string, number> = { student: 0, delegate: 1, admin: 2, superadmin: 3 };

  // Un moderateur ne peut agir ni sur lui-meme ni sur un utilisateur de rang egal ou superieur
  private async assertCanModerate(targetId: string, actor: { id: string; role: string }) {
    if (targetId === actor.id) throw new BadRequestException('Action impossible sur votre propre compte');
    const target = await this.prisma.utilisateur.findUnique({ where: { id: targetId }, select: { role: true } });
    if (!target) throw new NotFoundException('Utilisateur introuvable');
    if (actor.role !== 'superadmin' && this.ROLE_RANK[target.role] >= this.ROLE_RANK[actor.role]) {
      throw new ForbiddenException('Permissions insuffisantes sur cet utilisateur');
    }
  }

  async setRole(targetId: string, role: string, actor: { id: string; role: string }) {
    if (targetId === actor.id) throw new BadRequestException('Vous ne pouvez pas modifier votre propre rôle');
    const target = await this.prisma.utilisateur.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw new NotFoundException('Utilisateur introuvable');
    const updated = await this.prisma.utilisateur.update({ where: { id: targetId }, data: { role: role as any } });
    await this.prisma.auditLog.create({
      data: { utilisateurId: actor.id, action: 'SET_ROLE', ressource: 'utilisateur', ressourceId: targetId, metadata: { role } },
    });
    return updated;
  }

  async banUser(userId: string, actor: { id: string; role: string }, raison: string) {
    const adminId = actor.id;
    await this.assertCanModerate(userId, actor);
    const updated = await this.prisma.utilisateur.update({
      where: { id: userId },
      data: {
        estBanni: true,
        banniLe: new Date(),
      },
    });

    // Trace dans audit_logs
    await this.prisma.auditLog.create({
      data: {
        utilisateurId: adminId,
        action: 'BAN_USER',
        ressource: 'utilisateur',
        ressourceId: userId,
        metadata: { raison },
      },
    });

    return updated;
  }

  async unbanUser(userId: string, actor: { id: string; role: string }) {
    const adminId = actor.id;
    await this.assertCanModerate(userId, actor);
    const updated = await this.prisma.utilisateur.update({
      where: { id: userId },
      data: {
        estBanni: false,
        banniLe: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        utilisateurId: adminId,
        action: 'UNBAN_USER',
        ressource: 'utilisateur',
        ressourceId: userId,
      },
    });

    return updated;
  }
}