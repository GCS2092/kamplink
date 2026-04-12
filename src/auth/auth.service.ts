import { Injectable, ConflictException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private firebase: FirebaseService,
    private prisma: PrismaService,
  ) {}

  // Appelé après que Firebase a vérifié l'OTP côté mobile
  // Le mobile envoie l'idToken Firebase → on crée/récupère l'user en DB
  async loginWithFirebaseToken(idToken: string) {
    // 1. Vérifie le token avec Firebase
    const decoded = await this.firebase.verifyToken(idToken);
    const firebaseUid = decoded.uid;
    const telephone = decoded.phone_number;

    // 2. Cherche si l'utilisateur existe déjà
    let user = await this.prisma.utilisateur.findUnique({
      where: { firebaseUid },
      include: { profil: true },
    });

    // 3. Sinon, crée-le (première connexion)
    if (!user) {
      user = await this.prisma.utilisateur.create({
        data: {
          firebaseUid,
          telephone,
          role: 'student',
          estActif: true,
        },
        include: { profil: true },
      });
    }

    return {
      user,
      // Le mobile garde son idToken Firebase pour les prochaines requêtes
      // Pas besoin de générer un JWT custom — Firebase s'en charge
      message: user.profil ? 'Connecté' : 'Profil à compléter',
    };
  }

  // Création du profil académique après première connexion
  async createProfil(userId: string, data: {
    prenom: string;
    nom: string;
    niveau: string;
    universiteId: string;
    filiereId: string;
  }) {
    return this.prisma.profil.create({
      data: {
        utilisateurId: userId,
        prenom: data.prenom,
        nom: data.nom,
        niveau: data.niveau as any,
        universiteId: data.universiteId,
        filiereId: data.filiereId,
      },
    });
  }
}
