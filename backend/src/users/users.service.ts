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
import { normaliserCarte, normaliserNom } from './verification.utils';
import { UploadsService } from '../uploads/uploads.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private uploads: UploadsService,
  ) {}

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
        ...(dto.cvUrl && { cvUrl: dto.cvUrl }),
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

  // Soumet une demande de vérification (UC-03): photo + numéro de carte
  async submitVerification(userId: string, dto: SubmitVerificationDto) {
    const numeroCarte = normaliserCarte(dto.numeroCarte);
    if (numeroCarte.length < 4) throw new BadRequestException('Numéro de carte invalide');

    const profil = await this.prisma.profil.findUnique({ where: { utilisateurId: userId } });
    if (!profil) {
      throw new BadRequestException('Complétez votre profil avant de soumettre votre carte');
    }

    const existing = await this.prisma.verification.findUnique({ where: { utilisateurId: userId } });
    if (existing?.statut === 'verified') throw new ConflictException('Compte déjà vérifié');
    if (existing?.statut === 'pending') throw new ConflictException('Une demande est déjà en attente');

    // La photo doit avoir ete televersee par cet utilisateur
    if (!this.uploads.ownsCarte(userId, dto.photoCarteUrl)) {
      throw new BadRequestException("Photo de carte introuvable : téléversez-la d'abord");
    }

    // Une carte = un compte
    const [pris, enAttente] = await Promise.all([
      this.prisma.utilisateur.findFirst({
        where: { numeroCarte, id: { not: userId } },
        select: { id: true },
      }),
      this.prisma.verification.findFirst({
        where: { numeroCarte, statut: 'pending', utilisateurId: { not: userId } },
        select: { id: true },
      }),
    ]);
    if (pris || enAttente) {
      throw new ConflictException('Ce numéro de carte est déjà utilisé par un autre compte');
    }

    // Correspondance avec la liste officielle de l'université (information pour l'admin)
    let correspondanceListe = false;
    if (profil.universiteId) {
      const entree = await this.prisma.listeEtudiant.findUnique({
        where: { universiteId_numeroCarte: { universiteId: profil.universiteId, numeroCarte } },
      });
      if (entree) {
        correspondanceListe =
          normaliserNom(entree.nom) === normaliserNom(profil.nom) &&
          normaliserNom(entree.prenom) === normaliserNom(profil.prenom);
      }
    }

    const data = {
      photoCarteUrl: dto.photoCarteUrl,
      numeroCarte,
      correspondanceListe,
      statut: 'pending' as const,
      soumisLe: new Date(),
      decideLe: null,
      adminId: null,
      motifRejet: null,
    };
    const verification = existing
      ? await this.prisma.verification.update({ where: { utilisateurId: userId }, data })
      : await this.prisma.verification.create({ data: { utilisateurId: userId, ...data } });

    // Le resultat de la correspondance n'est pas renvoye a l'etudiant
    return { id: verification.id, statut: verification.statut, soumisLe: verification.soumisLe };
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
    const verif = await this.prisma.verification.findUnique({ where: { id: verificationId } });
    if (!verif) throw new NotFoundException('Vérification introuvable');
    if (verif.statut !== 'pending') throw new ConflictException('Demande déjà traitée');

    // Verification, profil, numero de carte (unique) et audit dans une seule transaction
    const ops: any[] = [
      this.prisma.verification.update({
        where: { id: verificationId },
        data: { statut: 'verified', decideLe: new Date(), adminId },
      }),
      this.prisma.profil.updateMany({
        where: { utilisateurId: verif.utilisateurId },
        data: { statutVerification: 'verified', verifiele: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          utilisateurId: adminId,
          action: 'APPROVE_VERIFICATION',
          ressource: 'verification',
          ressourceId: verificationId,
          metadata: { correspondanceListe: verif.correspondanceListe },
        },
      }),
    ];
    if (verif.numeroCarte) {
      ops.push(
        this.prisma.utilisateur.update({
          where: { id: verif.utilisateurId },
          data: { numeroCarte: verif.numeroCarte },
        }),
      );
    }
    const results: any[] = await this.prisma.$transaction(ops);
    const updated = results[0];

    // Minimisation: la photo de la carte est supprimee des la decision
    void this.uploads.deleteQuietly(verif.photoCarteUrl);

    this.notifications.notifySafe(
      verif.utilisateurId,
      'systeme',
      'Compte vérifié',
      'Votre carte étudiante a été validée.',
      { verificationId },
    );
    return updated;
  }
  // Rejette une verification avec motif
  async rejectVerification(verificationId: string, adminId: string, motifRejet: string) {
    const verif = await this.prisma.verification.findUnique({ where: { id: verificationId } });
    if (!verif) throw new NotFoundException('Vérification introuvable');
    if (verif.statut !== 'pending') throw new ConflictException('Demande déjà traitée');

    const [updated] = await this.prisma.$transaction([
      this.prisma.verification.update({
        where: { id: verificationId },
        data: { statut: 'rejected', decideLe: new Date(), adminId, motifRejet },
      }),
      this.prisma.profil.updateMany({
        where: { utilisateurId: verif.utilisateurId },
        data: { statutVerification: 'rejected' },
      }),
      this.prisma.auditLog.create({
        data: {
          utilisateurId: adminId,
          action: 'REJECT_VERIFICATION',
          ressource: 'verification',
          ressourceId: verificationId,
          metadata: { motifRejet },
        },
      }),
    ]);

    void this.uploads.deleteQuietly(verif.photoCarteUrl);

    this.notifications.notifySafe(
      verif.utilisateurId,
      'systeme',
      'Vérification refusée',
      `Votre carte étudiante a été refusée : ${motifRejet}`,
      { verificationId },
    );
    return updated;
  }

  // -----------------------------------------
  // ADMIN - Suspendre / Bannir un compte  // UC-24
  // ─────────────────────────────────────────

  private readonly ROLE_RANK: Record<string, number> = { student: 0, company: 0, delegate: 1, content_admin: 1, admin: 2, superadmin: 3 };

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