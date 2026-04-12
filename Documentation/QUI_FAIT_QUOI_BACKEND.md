# kamplink — Qui fait quoi (backend)

Ce document explique clairement les responsabilites:
- des composants techniques backend;
- des services externes;
- de l'equipe.

---

## 1) Responsabilite des composants techniques

## 1.1 `backend/src/main.ts`
- Demarre l'application NestJS.
- Active la securite HTTP (`helmet`).
- Active CORS sur les domaines autorises.
- Initialise Firebase Admin (verification token).

## 1.2 `backend/src/app.module.ts`
- Point d'entree des modules backend.
- Assemble les domaines (`auth`, `users`, `profiles`, `opportunities`, `jobs`, etc.).

## 1.3 `backend/src/prisma/*`
- `PrismaService`: connexion PostgreSQL.
- `PrismaModule`: expose Prisma globalement.

## 1.4 `backend/src/health/*`
- `/health`: etat API.
- `/ready`: etat API + DB.
- Utilise par Render pour health checks.

## 1.5 `backend/src/common/guards/*`
- `firebase-auth.guard.ts`: verifie le Bearer token Firebase.
- `roles.guard.ts`: verifie les roles (`admin`, `delegate`, `student`).

## 1.6 `backend/src/common/decorators/*`
- `@CurrentUser()`: recupere l'utilisateur courant.
- `@Roles(...)`: declare les roles requis par endpoint.

## 1.7 `backend/src/modules/users/*`
- Cree/liste les utilisateurs.
- Stocke le role metier SQL.

## 1.8 `backend/src/modules/profiles/*`
- Gere le profil utilisateur (prenom, nom, universite, etc.).
- Lien entre user Firebase (`uid`) et donnees SQL.

## 1.9 `backend/src/modules/opportunities/*`
- Cree et publie des opportunites.
- Endpoint public pour lire les opportunites publiees.

## 1.10 `backend/src/modules/jobs/*`
- Cree/liste les jobs SQL (asynchrone sans Redis).
- Types vises: notification, email, sms, cleanup.

## 1.11 `backend/src/worker/worker.main.ts`
- Lit les jobs `pending` dans PostgreSQL.
- Marque `processing` -> `done` ou `failed`.
- Tourne en service worker (Render Background Worker).

## 1.12 `backend/prisma/schema.prisma`
- Definit le schema DB versionne (source of truth SQL).
- Genere le client Prisma type-safe.

---

## 2) Responsabilite des services externes

## 2.1 Render
- Heberge l'API et le worker.
- Injecte les variables d'environnement.
- Redemarre le service apres deploy.

## 2.2 PostgreSQL managé (Render/Neon/Supabase)
- Stocke toutes les donnees metier backend.
- Gere persistance, backup, restauration.

## 2.3 Firebase (configure par toi)
- Authentification (ID tokens).
- FCM push.
- Eventuellement Storage.

Important:
- Firebase ne remplace pas la securite applicative backend.

---

## 3) Responsabilite de l'equipe

## 3.1 Toi (owner technique)
- Valider les decisions d'architecture.
- Gerer la config Firebase Console.
- Superviser la securite et les deploys.

## 3.2 Dev backend
- Implementer les modules metier.
- Ecrire migrations Prisma.
- Maintenir tests et quality gates.

## 3.3 Dev frontend
- Integrer API et gestion tokens.
- Gerer etats UX (loading/error/empty).
- Respecter les contrats API.

## 3.4 Ops/QA (meme si role partage)
- Verifier healthchecks, logs, alertes.
- Faire smoke tests avant prod.
- Tenir runbooks a jour.

---

## 4) Frontiere de responsabilite (tres clair)

- **Backend**:
  - autorisation,
  - validation,
  - logique metier,
  - securite des donnees,
  - audit.

- **Frontend**:
  - affichage,
  - ergonomie,
  - transport du token.

- **Firebase**:
  - service managé d'auth/push/storage.

---

## 5) Ce qui reste a faire maintenant

1. Brancher Firebase credentials reels dans Render et local.
2. Lancer les migrations sur ta base cible.
3. Completer les modules placeholders (`documents`, `moderation`, `notifications`, `admin`).
4. Ajouter tests integration sur endpoints proteges.
5. Activer CI/CD staging -> prod.

