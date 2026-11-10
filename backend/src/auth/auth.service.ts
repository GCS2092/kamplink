import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private firebase: FirebaseService,
    private prisma: PrismaService,
  ) {}

  // Appele apres que Firebase a verifie l'OTP cote mobile:
  // on cree ou recupere l'utilisateur en base. Le mobile garde son idToken Firebase.
  async loginWithFirebaseToken(idToken: string) {
    const decoded = await this.firebase.verifyToken(idToken);
    const firebaseUid = decoded.uid;
    const telephone = decoded.phone_number;

    let user = await this.prisma.utilisateur.findUnique({
      where: { firebaseUid },
      include: { profil: true },
    });

    if (!user) {
      try {
        user = await this.prisma.utilisateur.create({
          data: { firebaseUid, telephone, role: 'student', estActif: true },
          include: { profil: true },
        });
      } catch (e) {
        // Deux premieres connexions simultanees: on relit l'utilisateur deja cree
        user = await this.prisma.utilisateur.findUnique({
          where: { firebaseUid },
          include: { profil: true },
        });
        if (!user) throw e;
      }
    }

    return {
      user,
      message: user.profil ? 'Connecté' : 'Profil à compléter',
    };
  }
}