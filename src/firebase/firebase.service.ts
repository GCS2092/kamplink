import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
 private app!: admin.app.App;

  onModuleInit() {
    // Initialise Firebase Admin une seule fois au démarrage
    if (!admin.apps.length) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Les \n dans la clé privée doivent être interprétés
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
   } else {
  this.app = admin.apps[0] as admin.app.App;
}
  }

  // Vérifie un token JWT envoyé par le client mobile
  async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return admin.auth().verifyIdToken(token);
  }

  // Crée ou récupère un utilisateur Firebase par téléphone
  async getUserByPhone(phone: string): Promise<admin.auth.UserRecord> {
    return admin.auth().getUserByPhoneNumber(phone);
  }

  // Envoie une notification push via FCM
  async sendPushNotification(payload: {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<string> {
    return admin.messaging().send({
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        priority: 'high',
      },
    });
  }

  // Envoie une notif à plusieurs appareils à la fois
  async sendMulticast(payload: {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<admin.messaging.BatchResponse> {
    return admin.messaging().sendEachForMulticast({
      tokens: payload.tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
    });
  }
}