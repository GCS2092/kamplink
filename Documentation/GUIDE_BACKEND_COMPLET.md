# kamplink — Guide backend complet (version finale)

## 1) But du guide

Ce document definit la strategie backend complete de kamplink selon la bonne pratique:
- **API hebergee sur Render**
- **PostgreSQL comme base metier principale**
- **Firebase utilise de facon selective** (Auth/FCM/Storage si besoin)
- **sans Redis au lancement**
- **sans Docker obligatoire** (setup adapte PC modeste)

Objectif: t'amener a une production fiable, securisee et evolutive.

Note de coherence:
- dans ce guide, la convention officielle est `backend/`;
- si une ancienne mention `apps/api` apparait encore, il faut la lire comme `backend/`.

---

## 2) Decision d'architecture (reference officielle)

### 2.1 Ce que tu heberges toi-meme

- Backend API (NestJS/Fastify) sur Render
- Worker backend (optionnel) sur Render Background Worker
- Base PostgreSQL managée (Render Postgres / Neon / Supabase)

### 2.2 Ce que tu ne heberges pas toi-meme

- Firebase Auth
- Firebase Cloud Messaging (FCM)
- Firebase Storage (si utilise)

Firebase est deja un service cloud gere.  
Tu dois le **configurer** et le **securiser**, pas le deployer sur un serveur.

### 2.3 Convention de dossier (pour eviter la confusion)

Le dossier backend officiel du projet doit s'appeler:
- `backend`

Convention recommandee:
```txt
CampusLink/
  backend/
  frontend-web/
  mobile/
  Documentation/
```

---

## 2.b Architecture MVC (backend)

Tu veux du MVC, c'est tres bien pour garder une structure claire.

Dans `backend`:
- **Model**: schema Prisma + acces DB + entites metier
- **View**: reponses API (JSON DTO), formatage des sorties
- **Controller**: endpoints HTTP, orchestration des appels service

Implementation pratique avec NestJS:
- `controllers/` -> routes HTTP
- `services/` -> logique metier (coeur)
- `repositories/` -> acces Prisma/PostgreSQL
- `dto/` + `validators/` -> contrats d'entree/sortie

Regle: garder la logique metier dans `services`, pas dans `controllers`.

---

## 3) Responsabilite securite (important)

Meme avec Firebase, la securite reste ta responsabilite applicative:

- controle d'acces (roles, permissions, ownership)
- validation stricte des entrees
- protection des donnees sensibles
- gestion des secrets
- audit, monitoring, alertes
- conformite legale (consentement, retention, suppression)

Regle: infrastructure geree != securite complete automatique.

---

## 4) Architecture backend cible

### 4.1 Composants

- `apps/api`: API HTTP principale
- `apps/worker`: traitements asynchrones (cron + jobs SQL)
- PostgreSQL: source de verite metier
- Firebase Auth: authentification
- FCM: notifications push
- Storage (Firebase ou S3-compatible): fichiers
- Sentry + logs JSON: observabilite

### 4.2 Modules metier a implementer

- `auth`
- `users`
- `profiles`
- `universities` / `departments`
- `spaces` / `channels` / `posts`
- `documents`
- `opportunities`
- `moderation` / `reports`
- `notifications`
- `admin`
- `audit`
- `marketplace` (phase 3)

---

## 5) Stack technique recommandee

### 5.1 API

- Node.js 20 LTS
- TypeScript
- NestJS + Fastify
- Prisma + PostgreSQL
- Zod (validation)
- Pino (logs)
- Sentry (erreurs)
- Node-cron (jobs planifies)

### 5.2 Packages coeur

- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/platform-fastify`
- `@nestjs/config`
- `@nestjs/throttler`
- `prisma`
- `@prisma/client`
- `zod`
- `nestjs-pino`
- `pino`
- `node-cron`
- `firebase-admin`
- `@sentry/node`

---

## 6) Environnements (sans Docker)

### 6.1 Principe

Tu utilises une DB PostgreSQL hebergee meme en dev/staging/prod, avec bases separees.

### 6.2 Envs obligatoires

- `dev`
- `staging`
- `prod`

Chaque env a:
- sa base PostgreSQL
- ses secrets
- son URL API
- ses credentials Firebase (idealement projet separe staging/prod)

---

## 7) Donnees & schema PostgreSQL

### 7.1 Regles de modelisation

- UUID comme IDs
- `createdAt`, `updatedAt`
- soft delete quand necessaire
- FK explicites
- index sur colonnes filtrees
- contraintes d'unicite sur champs critiques

### 7.2 Tables critiques

- `users`
- `profiles`
- `opportunities`
- `posts`
- `documents`
- `reports`
- `moderation_actions`
- `notifications`
- `device_tokens`
- `audit_logs`
- `jobs` (asynchrone sans Redis)
- `blocked_ips` / `blocked_accounts`

### 7.3 Migrations

Workflow strict:
1. changer `schema.prisma`
2. generer migration
3. verifier SQL
4. tester sur staging
5. deploy migration en prod via CI/CD

Jamais de modifications manuelles directes en prod sans trace.

---

## 8) Authentification et autorisation

### 8.1 Auth recommandee

Firebase Auth pour login/OTP/session.

Flux:
1. client recupere ID token Firebase
2. backend verifie le token avec `firebase-admin`
3. backend mappe `uid` vers user interne
4. backend applique roles/permissions SQL

### 8.2 Autorisation backend (obligatoire)

- controle par role (`admin`, `delegate`, `student`)
- controle ownership (resource owner)
- permissions metier centralisees cote serveur
- jamais de confiance dans les roles du client

---

## 9) API securisee (bonnes pratiques)

### 9.1 Validation

- validation d'entree avec `zod` sur chaque endpoint
- sanitation des champs texte
- rejet des payloads invalides

### 9.2 Protections

- `helmet` (headers de securite)
- CORS strict sur domaines officiels
- throttling par IP + user
- captcha pour endpoints sensibles
- taille max body/upload limitee

### 9.3 Erreurs

Format unique:
- `code`
- `message`
- `details`
- `requestId`

Ne jamais exposer stack interne au client.

---

## 10) Donnees sensibles et conformite

### 10.1 Ce qui est sensible

- identite etudiante
- telephone/email
- documents verifies (cartes, justificatifs)
- donnees de moderation
- donnees transactions (phase 3)

### 10.2 Regles de protection

- minimisation des donnees collecte
- chiffrement en transit (HTTPS) + chiffrement au repos (service managé)
- acces limite par role
- journalisation des acces sensibles
- retention claire par type de donnee
- suppression/export utilisateur sur demande (DSR)

### 10.3 Secrets

- uniquement dans variables d'environnement Render
- jamais dans Git
- rotation periodique

---

## 11) Fichiers (documents, images)

Options:
- Firebase Storage
- S3-compatible (R2/S3/Supabase Storage)

Regles:
- verifier MIME, taille, extension
- URLs signees
- dossiers logiques par type
- pas de bucket public pour contenu prive

---

## 12) Asynchrone sans Redis

### 12.1 Strategie

- table SQL `jobs`
- statuts: `pending`, `processing`, `done`, `failed`
- retries avec backoff stocke en DB
- worker Render qui traite les jobs
- cron pour taches planifiees (expiration offres, relances, etc.)

### 12.2 Types de jobs

- notifications push
- emails transactionnels
- SMS critiques
- moderation differree
- maintenance periodique

---

## 13) Notifications, email, SMS

### 13.1 Push

- FCM pour mobile
- tokens stockes en DB
- invalidation automatique des tokens obsoletes

### 13.2 Email

- provider dedie (Resend/SendGrid/Postmark)
- templates versionnes
- logs de livraison

### 13.3 SMS

- provider local/regional (Termii/Africa's Talking)
- usage cible (messages critiques)

---

## 14) Moderation, anti-abus, anti-fraude

- endpoint signalement
- file de triage admin
- actions moderees tracees dans `moderation_actions`
- suspension compte / suppression contenu
- blocage IP et compte abuseur
- seuils anti-spam automatises

---

## 15) Observabilite et fiabilite

### 15.1 Logs & erreurs

- logs JSON (`pino`)
- correlation ID (`x-request-id`)
- Sentry API + worker

### 15.2 Alertes minimales

- hausse 5xx
- latence anormale
- echec envoi notif/email/sms
- erreurs auth
- jobs bloques

### 15.3 SLO initiaux

- disponibilite API >= 99.5%
- latence p95 endpoints critiques < 700ms (cible initiale)
- taux erreur serveur < 1%

---

## 16) Hebergement avec Render (pas a pas conceptuel)

### 16.1 Services Render

1. **Web Service API**
   - build: `npm ci && npm run build`
   - start: `npm run start:prod`
   - healthcheck: `/health`

2. **Background Worker** (optionnel mais recommande)
   - start: `npm run worker:start`

3. **PostgreSQL** (ou externe Neon/Supabase)

### 16.2 Variables Render (backend)

- `NODE_ENV=production`
- `DATABASE_URL`
- `CORS_ORIGIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `SENTRY_DSN`
- `EMAIL_PROVIDER_API_KEY`
- `SMS_PROVIDER_API_KEY`

---

## 17) Connexion frontend <-> backend

### 17.1 Frontend web

- `NEXT_PUBLIC_API_URL` = URL API Render
- Firebase client configure cote front
- bearer token envoye sur routes protegees

### 17.2 Frontend mobile

- base URL API via config d'environnement
- ID token Firebase joint aux requetes
- gestion refresh/session cote client

### 17.3 Regle critique

Les operations metier sensibles passent par ton backend, pas direct DB depuis client.

---

## 18) CI/CD et release

Pipeline minimal:
1. lint
2. typecheck
3. tests
4. build
5. migration staging
6. deploy staging
7. smoke tests
8. approbation manuelle
9. migration prod
10. deploy prod

Bonnes pratiques:
- rollback documente
- migrations non destructives si possible
- release notes a chaque deploiement

---

## 19) Tests obligatoires backend

### 19.1 Unit

- services metier
- permissions
- validation schemas

### 19.2 Integration

- endpoints critiques + DB staging de test
- auth guard
- uploads/documents

### 19.3 Smoke pre-prod

- login
- endpoint protege
- creation/modification contenu
- moderation de base
- notification test

---

## 20) Risques de tout centraliser dans Firebase

- erreur de rules = fuite potentielle
- lock-in fournisseur
- couts imprenvisibles si requetes mal optimisees
- limite pour reporting/analytics avances

D'ou la strategie retenue:
- PostgreSQL pour le coeur metier
- Firebase en services complementaires utiles

---

## 21) Roadmap execution (12 semaines)

### Semaines 1-2
- bootstrap API + config env
- connexion PostgreSQL hebergee
- schema Prisma initial

### Semaines 3-4
- auth Firebase verify + mapping user
- modules users/profiles
- roles/permissions v1

### Semaines 5-6
- spaces/channels/posts/documents
- upload securise
- anti-abus de base

### Semaines 7-8
- opportunities + expiration
- jobs SQL + worker
- notifications push/email/sms

### Semaines 9-10
- moderation + audit logs
- tableaux admin minimum
- hardening endpoints

### Semaines 11-12
- monitoring/alerting complet
- CI/CD complet staging/prod
- smoke + go-live progressif

---

## 22) Checklist go-live finale

- [ ] API Render stable + healthcheck ok
- [ ] DB sauvegardee et restauree en test
- [ ] Secrets correctement configures
- [ ] Auth et permissions testes
- [ ] Validation input sur 100% endpoints critiques
- [ ] Monitoring + alertes actifs
- [ ] Runbook incident redige
- [ ] Conformite data minimale en place
- [ ] Front connecte a la bonne API
- [ ] Beta restreinte validee avant ouverture large

---

## 23) Conclusion

La bonne strategie pour ton contexte est:
- **PostgreSQL-first**
- **Render pour l'hebergement backend**
- **Firebase selectif (Auth/FCM/Storage si necessaire)**
- **securite applicative geree serieusement par toi**

Avec cette approche, tu limites la complexite, respectes les contraintes machine, et gardes une base solide pour scaler.

---

## 35) Pourquoi cette stack vs Laravel/Django (comparaison objective)

### 35.1 Stack retenue

- Backend: Node.js + TypeScript + NestJS (MVC)
- DB: PostgreSQL + Prisma
- Hebergement: Render
- Firebase selectif: Auth/FCM/Storage

### 35.2 Pourquoi cette stack est coherente pour toi

- Tu as deja un ecosysteme frontend JS/TS -> meilleure continuite.
- Meme langage sur web/mobile/backend -> moins de friction.
- Prisma apporte un workflow DB moderne et type-safe.
- NestJS structure bien les gros projets (module + MVC).

### 35.3 Laravel (PHP) vs ton choix

**Points forts Laravel**
- tres productif en CRUD/admin
- MVC natif excellent
- ecosysteme mature

**Pourquoi ce n'est pas mon premier choix ici**
- changement de langage (PHP) alors que ton projet est deja TS-centric
- partage de types front/back plus difficile
- courbe de transition equipe plus forte si vous etes JS

### 35.4 Django (Python) vs ton choix

**Points forts Django**
- securite solide par defaut
- admin natif tres rapide a mettre en place
- excellent pour applications data-heavy

**Pourquoi ce n'est pas mon premier choix ici**
- changement complet de stack (Python)
- moins de continuite naturelle avec frontend TS
- besoin d'une discipline de typage supplementaire pour eviter derives de contrats

### 35.5 Y a-t-il une meilleure stack absolue ?

Non, il n'y a pas de meilleure stack universelle.  
Il y a la meilleure stack **pour ton contexte**.

Pour ton contexte actuel (Render, PostgreSQL, Firebase selectif, front JS/TS), la meilleure strategie reste:
- `backend` en NestJS MVC + Prisma/PostgreSQL

Tu gardes vitesse, lisibilite, et evolutivite sans te disperser.

---

## 36) Arborescence MVC exacte du dossier `backend`

Structure recommandee:

```txt
backend/
  src/
    main.ts
    app.module.ts
    config/
      env.validation.ts
      firebase-admin.config.ts
      sentry.config.ts
    common/
      guards/
        firebase-auth.guard.ts
        roles.guard.ts
      decorators/
        current-user.decorator.ts
        roles.decorator.ts
      filters/
        http-exception.filter.ts
      interceptors/
        response.interceptor.ts
        request-id.interceptor.ts
      pipes/
        zod-validation.pipe.ts
      utils/
        pagination.util.ts
    prisma/
      prisma.module.ts
      prisma.service.ts
    modules/
      users/
        users.module.ts
        users.controller.ts
        users.service.ts
        users.repository.ts
        dto/
          create-user.dto.ts
          update-user.dto.ts
      profiles/
        profiles.module.ts
        profiles.controller.ts
        profiles.service.ts
        profiles.repository.ts
      opportunities/
        opportunities.module.ts
        opportunities.controller.ts
        opportunities.service.ts
        opportunities.repository.ts
      documents/
        documents.module.ts
        documents.controller.ts
        documents.service.ts
        documents.repository.ts
      moderation/
        moderation.module.ts
        moderation.controller.ts
        moderation.service.ts
        moderation.repository.ts
      notifications/
        notifications.module.ts
        notifications.controller.ts
        notifications.service.ts
        notifications.repository.ts
      admin/
        admin.module.ts
        admin.controller.ts
        admin.service.ts
    worker/
      worker.main.ts
      jobs/
        notifications.job.ts
        cleanup.job.ts
        reminders.job.ts
  prisma/
    schema.prisma
    migrations/
  test/
    unit/
    integration/
  .env.local
  .env.staging
  .env.production
  package.json
  tsconfig.json
```

### 36.1 Role de chaque couche (MVC + propre)

- **Controller** (`*.controller.ts`)
  - recoit requetes HTTP
  - valide/authentifie/autorise
  - appelle `service`
  - renvoie reponse standardisee

- **Service** (`*.service.ts`)
  - contient la logique metier
  - gere regles produit
  - orchestre transactions/requetes complexes
  - n'expose pas de details HTTP

- **Repository** (`*.repository.ts`)
  - centralise les acces Prisma/PostgreSQL
  - requetes SQL type-safe
  - zero logique metier lourde ici

- **DTO / Validation**
  - contrat d'entree/sortie
  - securise les payloads
  - evite derive des formats

### 36.2 Regles d'organisation pour rester propre

- 1 module = 1 domaine metier.
- Pas de logique metier dans les controllers.
- Pas d'appel DB direct depuis les controllers.
- Une validation explicite sur chaque endpoint d'ecriture.
- Les permissions se gerent via guards/decorators communs.

### 36.3 Exemple de flux MVC (endpoint protege)

1. `POST /opportunities`
2. `firebase-auth.guard` valide le token
3. `roles.guard` verifie le role autorise
4. DTO + `zod-validation.pipe` valide l'entree
5. `opportunities.service` applique regles metier
6. `opportunities.repository` ecrit en PostgreSQL
7. `response.interceptor` formate la sortie

Cette structure t'evite la confusion quand le projet grossit.

---

## 24) Guide pas-a-pas operationnel (tres concret)

Cette section explique **comment faire** de maniere pratique: quoi cliquer, quoi configurer, quoi lancer.

## 24.1 Ordre recommande (important)

1. Configurer PostgreSQL (local ou heberge)
2. Configurer Prisma (schema + migration)
3. Lancer API localement et tester DB
4. Configurer Firebase (Auth + FCM)
5. Connecter API a Firebase Admin
6. Deployer API sur Render
7. Connecter frontend a l'API Render
8. Activer monitoring + checklist securite

Si tu suis cet ordre, tu evites 80% des blocages.

---

## 25) PostgreSQL: local vs heberge (sans Docker)

## 25.1 Option A (recommandee pour PC modeste): PostgreSQL heberge

Utilise Neon ou Supabase Postgres (plan gratuit).

Etapes:
1. Creer un projet DB sur Neon/Supabase.
2. Recuperer `DATABASE_URL` (format `postgresql://...`).
3. Copier cette URL dans `.env.local`.
4. Tester la connexion depuis ton API.

Avantages:
- pas de charge machine locale;
- pas d'installation lourde;
- proche de la prod.

## 25.2 Option B: PostgreSQL local (sans Docker)

Si tu veux local:
1. Installer PostgreSQL via installateur officiel.
2. Ouvrir pgAdmin ou psql.
3. Creer base:
   - nom: `kamplink_dev`
   - user: `kamplink`
   - password fort
4. Creer URL:
   - `postgresql://kamplink:motdepasse@localhost:5432/kamplink_dev`
5. Mettre cette URL dans `.env.local`.

Commandes psql utiles:
```sql
CREATE DATABASE kamplink_dev;
CREATE USER kamplink WITH ENCRYPTED PASSWORD 'motdepassefort';
GRANT ALL PRIVILEGES ON DATABASE kamplink_dev TO kamplink;
```

---

## 26) Prisma: a quoi ca sert et comment l'utiliser

### 26.1 A quoi sert Prisma

Prisma sert a:
- modeliser ta base en code (`schema.prisma`);
- generer les tables via migrations;
- faire des requetes SQL de maniere type-safe en TypeScript.

En bref: c'est ton pont propre entre API et PostgreSQL.

### 26.2 Installation et initialisation

Dans `apps/api`:
```bash
npm install prisma @prisma/client
npx prisma init
```

Cela cree:
- `prisma/schema.prisma`
- `.env` (a adapter selon ton setup)

### 26.3 Configuration minimale `schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 26.4 Premier modele

```prisma
model User {
  id         String   @id @default(uuid())
  firebaseUid String  @unique
  email      String?  @unique
  role       String   @default("student")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### 26.5 Creer la migration

```bash
npx prisma migrate dev --name init_user
npx prisma generate
```

### 26.6 Lire la DB

```bash
npx prisma studio
```

### 26.7 En production

En CI/CD ou sur Render:
```bash
npx prisma migrate deploy
```

---

## 27) API NestJS: configuration de base

### 27.1 Variables env minimales

`.env.local`:
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://...
CORS_ORIGIN=http://localhost:3000
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SENTRY_DSN=...
```

### 27.2 Ce que doit faire ton API au demarrage

- verifier presence des variables critiques;
- ouvrir connexion DB;
- exposer `/health`;
- charger middleware securite (`helmet`, `cors`, throttle).

### 27.3 Endpoint health minimal

- `GET /health` retourne:
  - status API
  - status DB
  - version app

Ce endpoint est obligatoire pour Render.

---

## 28) Firebase: que configurer exactement

## 28.1 Projet Firebase

1. Creer projet dans Firebase Console.
2. Activer Authentication.
3. Activer providers voulus (Phone, Email).
4. Ajouter app Web et/ou Android.

## 28.2 Cote frontend

Tu mets dans le front:
- API key publique Firebase
- authDomain
- projectId
- appId
- messagingSenderId

Ces variables sont publiques (normal pour Firebase client SDK).

## 28.3 Cote backend (Render)

Tu crees un service account Firebase:
1. Firebase Console -> Project settings -> Service accounts
2. Generer cle privee JSON
3. Copier uniquement les champs utiles dans env Render:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

Le backend utilise ces infos avec `firebase-admin` pour verifier les tokens.

## 28.4 Verification token dans API

Flux:
1. frontend envoie `Authorization: Bearer <idToken>`
2. guard backend lit le token
3. `firebaseAdmin.auth().verifyIdToken(token)`
4. backend recupere `uid`, charge user SQL, applique permissions

---

## 29) Render: quoi faire exactement

## 29.1 Creer le service API

1. Connecter repo GitHub a Render.
2. New -> Web Service.
3. Root directory: dossier backend (ex: `apps/api`).
4. Build command:
   - `npm ci && npm run build`
5. Start command:
   - `npm run start:prod`
6. Health check path:
   - `/health`

## 29.2 Variables d'environnement Render

Ajouter:
- `DATABASE_URL`
- `CORS_ORIGIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `SENTRY_DSN`
- `EMAIL_PROVIDER_API_KEY`
- `SMS_PROVIDER_API_KEY`

## 29.3 Migrations Prisma sur Render

Option simple:
- dans build/start flow, executer `prisma migrate deploy` avant startup.

Exemple start:
```bash
npx prisma migrate deploy && npm run start:prod
```

## 29.4 Worker Render (optionnel)

Si tu traites notifications asynchrones:
1. New -> Background Worker
2. Command:
   - `npm run worker:start`
3. Meme env vars que l'API (au minimum DB + providers)

---

## 30) Frontend: connexion propre au backend

## 30.1 Web (Next.js)

Variables:
```env
NEXT_PUBLIC_API_URL=https://ton-api.onrender.com
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
```

Appels API:
- recuperer ID token Firebase cote client
- envoyer Bearer token sur endpoints proteges

## 30.2 Mobile (Expo)

- stocker URL API par environnement
- joindre token Firebase dans headers
- gerer expiration session et refresh

---

## 31) Securite DB et donnees sensibles (ce que tu dois faire toi)

Meme si Firebase existe, tu dois faire:

1. **Controle d'acces SQL**
   - aucune route sensible sans auth guard
   - verif role + ownership

2. **Protection des secrets**
   - secrets uniquement dans env Render
   - jamais dans repo

3. **Protection donnees sensibles**
   - minimisation de collecte
   - retention definie
   - acces admin journalise

4. **Sauvegardes DB**
   - actives
   - test restauration mensuel

5. **Audit & alertes**
   - logs actions admin
   - alertes incidents auth et 5xx

---

## 32) Checklists ultra pratiques

### 32.1 Checklist "backend pret local"
- [ ] DB connectee
- [ ] Prisma migration OK
- [ ] `/health` OK
- [ ] Auth guard OK
- [ ] CRUD user/profil OK

### 32.2 Checklist "backend pret Render"
- [ ] service API cree
- [ ] env vars completees
- [ ] migration deploy OK
- [ ] healthcheck vert
- [ ] logs sans erreur critique

### 32.3 Checklist "integration front-back"
- [ ] login front OK
- [ ] token envoye en Bearer
- [ ] endpoint protege OK
- [ ] erreurs gerees proprement
- [ ] CORS correct

### 32.4 Checklist "go-live minimum"
- [ ] monitoring actif
- [ ] sauvegardes actives
- [ ] runbook incident redige
- [ ] staging teste
- [ ] ouverture beta graduelle

---

## 33) Erreurs frequentes a eviter (tres concret)

- mettre les credentials Firebase JSON dans Git
- oublier `\n` dans `FIREBASE_PRIVATE_KEY`
- deployer sans `prisma migrate deploy`
- front qui pointe vers mauvaise URL API
- endpoints critiques sans validation `zod`
- CORS en `*` en production
- pas de backup DB avant go-live

---

## 34) En une phrase: qui fait quoi ?

- **Render**: heberge ton backend et worker.
- **PostgreSQL**: stocke tes donnees metier.
- **Prisma**: gere schema, migrations et acces DB en TypeScript.
- **Firebase**: gere auth/push (et storage si choisi).
- **Toi**: geres securite applicative, permissions, secrets, qualite et operations.


# kamplink — Guide complet de mise en place du backend

## 1) Objectif

Ce guide explique en detail comment construire tout le backend de kamplink, de l'initialisation locale jusqu'au deploiement production, avec une architecture **PostgreSQL-first**.

Approche retenue:
- API metier: Node.js + TypeScript + NestJS (Fastify adapter)
- Base principale: PostgreSQL
- Jobs asynchrones: execution sans Redis (cron + table SQL de jobs)
- Auth: Firebase Auth (option rapide) ou OTP provider
- Push: FCM
- Email/SMS: provider externe
- Observabilite: Sentry + logs structures

---

## 2) Architecture backend cible

### 2.1 Composants

- `apps/api`: API HTTP principale (NestJS)
- `PostgreSQL`: source de verite metier
- `Worker`: traitement asynchrone base sur PostgreSQL (sans Redis)
- `Object Storage`: fichiers (Firebase Storage ou S3 compatible)
- `Auth Provider`: Firebase Auth (verification token cote backend)

### 2.2 Modules metier backend

- `auth`
- `users`
- `profiles`
- `universities`
- `spaces`
- `channels`
- `posts`
- `documents`
- `opportunities`
- `moderation`
- `notifications`
- `marketplace` (phase 3)
- `admin`
- `audit`

---

## 3) Prerequis techniques

- Node.js 20 LTS
- npm 10+
- Git
- Compte Firebase (si Auth/FCM)
- Compte Sentry
- Un service PostgreSQL heberge (Neon/Supabase/Cloud SQL)

---

## 4) Structure monorepo recommandee

```txt
kamplink/
  apps/
    api/
    web/
    mobile/
    worker/
  packages/
    shared/
    eslint-config/
    tsconfig/
  infra/
    sql/
  .github/workflows/
```

---

## 5) Initialisation du backend

## 5.1 Creer `apps/api`

1. Initialiser projet NestJS (Fastify).
2. Activer TypeScript strict.
3. Ajouter architecture modulaire par domaine.

## 5.2 Packages backend a installer

Dependances principales:
- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/platform-fastify`
- `@nestjs/config`
- `@nestjs/throttler`
- `prisma`
- `@prisma/client`
- `zod`
- `pino`
- `nestjs-pino`
- `node-cron`
- `@sentry/node`
- `firebase-admin`
- `class-transformer` (si utile)

Dev:
- `typescript`
- `ts-node`
- `eslint`
- `prettier`
- `vitest` ou `jest`

---

## 6) Environnement local (sans Docker)

Approche adaptee a un PC modeste:
- utiliser une base PostgreSQL **hebergee** meme en dev (Neon/Supabase en plan gratuit).
- lancer uniquement l'API en local.

Avantages:
- faible consommation machine locale;
- pas de Docker a maintenir;
- environnement proche de la realite production.

---

## 7) Configuration environnement backend

Creer des fichiers:
- `.env.local`
- `.env.staging`
- `.env.production`

Variables minimales:
- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_ISSUER` (si auth interne)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `SENTRY_DSN`
- `EMAIL_PROVIDER_API_KEY`
- `SMS_PROVIDER_API_KEY`

Regles:
- aucun secret dans Git;
- rotation periodique;
- secrets chiffrables via secret manager.

---

## 8) Schema de donnees (Prisma + PostgreSQL)

## 8.1 Entites coeur

- `User`
- `Profile`
- `University`
- `Department` (filiere)
- `Space`
- `Channel`
- `Post`
- `Document`
- `Opportunity`
- `OpportunityTag`
- `Report` (signalement)
- `ModerationAction`
- `Notification`
- `DeviceToken`
- `AuditLog`
- `Transaction` (phase 3)

## 8.2 Regles de modelisation

- IDs en `uuid`
- timestamps `createdAt/updatedAt`
- soft-delete sur contenus sensibles
- contraintes FK explicites
- index sur champs filtres frequents

## 8.3 Migration

Workflow:
1. Modifier `schema.prisma`
2. `prisma migrate dev`
3. Verifier SQL genere
4. Commit migration
5. `prisma migrate deploy` en CI/CD

---

## 9) Architecture API (NestJS)

### 9.1 Couches

- `Controller`: I/O HTTP
- `Service`: logique metier
- `Repository`: acces DB (Prisma)
- `Domain`: regles metier pures
- `DTO + Schemas`: validation

### 9.2 Validation

- Valider toutes les entrees avec `zod`.
- Refuser payload non conforme (400).
- Sanitiser les champs texte.

### 9.3 Erreurs

- format d'erreur stable:
  - `code`
  - `message`
  - `details`
  - `requestId`

---

## 10) Authentification et autorisation

## 10.1 Option recommandee (rapide): Firebase Auth

Flux:
1. Client recupere ID token Firebase.
2. API verifie token via `firebase-admin`.
3. API mappe `uid` vers `User`.
4. Roles internes en DB (`admin`, `delegate`, `student`).

Avantages:
- OTP/sessions deja gerees.
- integration mobile rapide.

## 10.2 Autorisation

- Guards NestJS par role.
- Regles fines par ressource (owner, delegate, admin).
- Ne jamais faire confiance au role recu du client.

---

## 11) Rate limiting, anti-abus, anti-spam

- `@nestjs/throttler` pour endpoints publics.
- Limites par IP + userId + endpoint.
- Captcha pour endpoints sensibles (inscription, upload, contact).
- Blacklist temporaire en table PostgreSQL (`blocked_ips`, `blocked_accounts`).

---

## 12) Fichiers et documents

Deux options:
- Firebase Storage (si tu gardes Firebase partiellement)
- S3 compatible (Cloudflare R2 / AWS S3 / Supabase Storage)

Regles:
- verifier MIME et taille max;
- scan antivirus si possible (asynchrone);
- URLs signees avec expiration;
- ne jamais exposer bucket public brut pour docs prives.

---

## 13) Notifications, email, SMS

## 13.1 Worker asynchrone (sans Redis)

Creer `apps/worker` avec:
- `node-cron` pour les taches planifiees
- une table SQL `jobs` (etat: `pending`, `processing`, `done`, `failed`)
- retries avec backoff stockes en DB

Jobs typiques:
- `notifications`
- `emails`
- `sms`
- `moderation`

## 13.2 Push FCM

- stocker tokens device en DB
- invalider tokens expirants
- retries exponentiels sur echec

## 13.3 Email/SMS

- templates versionnes
- log de livraison
- fallback provider en cas de panne critique

---

## 14) Moderation et securite contenu

- endpoint `report content`
- triage admin avec statuts (`open`, `reviewing`, `resolved`)
- `moderation_actions` historise qui a fait quoi
- outils admin: masquer/supprimer/suspendre

---

## 15) Logging, monitoring, tracing

- logs JSON avec `pino`
- correlation ID (`x-request-id`)
- Sentry sur API + worker
- alertes:
  - taux erreurs 5xx
  - hausse latence
  - echec notifications
  - erreurs auth

---

## 16) Tests backend

### 16.1 Unit tests
- services metier critiques
- regles de permissions
- validation schemas

### 16.2 Integration tests
- API + base de test hebergee dediee (schema isole)
- auth guard + endpoints critiques

### 16.3 End-to-end smoke tests
- login
- creation post
- upload document
- publication opportunite
- report moderation

---

## 17) CI/CD backend

Pipeline minimum:
1. install
2. lint
3. typecheck
4. tests
5. build
6. migrations staging
7. deploy staging
8. smoke tests
9. validation manuelle
10. deploy prod

Regles:
- pas de deploy prod direct depuis local;
- migrations obligatoirement versionnees.

---

## 18) Deploiement production

Options:
- Cloud Run (recommande pour API NestJS)
- Railway/Fly/Render (simple au debut)
- GKE (plus tard, si besoin)

Recommande:
- API sur Cloud Run
- Postgres managé (Cloud SQL / Neon / Supabase Postgres)
- pas de Redis obligatoire au lancement

Checklist prod:
- TLS actif
- backups auto
- rotation secrets
- alertes actives
- runbooks incidents valides

---

## 19) Runbooks essentiels

Creer des procedures ecrites pour:
- panne DB
- echec migration
- hausse spam
- incident auth
- provider email/SMS indisponible
- rollback release

Chaque runbook doit contenir:
- symptomes
- verification rapide
- actions immediates
- escalade
- post-mortem

---

## 20) Roadmap d'implementation (90 jours)

### S1-S2
- initialiser monorepo
- connexion a un PostgreSQL heberge (dev)
- bootstrap API NestJS
- config env + logging

### S3-S4
- schema Prisma v1
- migrations
- modules auth/users/profiles

### S5-S6
- modules spaces/channels/posts/documents
- permissions par role
- upload avec URL signee

### S7-S8
- module opportunities + tags + expiration
- module notifications + worker

### S9-S10
- moderation + signalements
- dashboard admin minimal

### S11-S12
- hardening securite
- observabilite complete
- CI/CD staging->prod
- test charge initial + go-live

---

## 21) Definition of Done (backend pret production)

- architecture modulaire stable
- couverture tests critique en place
- migrations fiables et rejouables
- alerting actif
- runbooks prets
- zero secret dans le code
- permissions verifiees sur endpoints sensibles
- capacite de rollback validee

---

## 22) Erreurs a eviter

- tout coder en une seule API sans modules
- melanger logique HTTP et logique metier
- ignorer les migrations et modifier DB a la main
- sous-estimer rate limiting et moderation
- deployer sans monitoring
- attendre la prod pour traiter la securite

---

## 23) Conclusion

La bonne strategie pour kamplink est:
- PostgreSQL comme fondation metier solide;
- API TypeScript modulaire;
- worker sans Redis (cron + table jobs SQL) au debut;
- Firebase utilise seulement pour les briques qui accelerent (Auth/FCM).

Tu obtiens un backend evolutif, robuste et adapte a une croissance reelle.

---

## 24) Render + Firebase + Frontend: architecture finale de mise en ligne

### 24.1 Reponse directe a ta question

- **Oui**, ton backend NestJS doit etre heberge (tu as choisi Render, tres bien).
- **Firebase n'a pas besoin d'etre "heberge par toi"**: c'est deja un service cloud gere par Google.
- Tu configures Firebase (Auth, FCM, Storage si utilise), puis tu connectes ton backend Render et ton frontend a ces services.

En resume:
- Backend API -> heberge sur Render
- Base PostgreSQL -> hebergee (Neon/Supabase/Render Postgres)
- Frontend web -> heberge (Vercel/Render Static Site)
- Mobile -> compilee et distribuee (Play Store)
- Firebase -> service managé (pas de serveur a deployer)

### 24.2 Ce qui doit etre en ligne (obligatoire)

1. **API backend (Render Web Service)**
   - Expose URL API publique HTTPS.
   - Connectee a PostgreSQL.
   - Lit les variables d'environnement (secrets).

2. **PostgreSQL managé**
   - Base principale du produit.
   - Sauvegardes automatiques.
   - Acces restreint IP/credentials.

3. **Frontend web**
   - URL publique.
   - Pointe vers API Render via variable `NEXT_PUBLIC_API_URL`.

4. **Firebase project**
   - Auth active (si OTP/email).
   - FCM configure (push).
   - Storage configure (si tu l'utilises).

5. **Provider email/SMS**
   - Clés API configurees cote backend.
   - Templates transactionnels prets.

### 24.3 Ce qui n'a pas besoin d'etre "heberge manuellement"

- Firebase Auth
- Firebase FCM
- Firebase Storage
- Firebase Console

Tu dois seulement:
- configurer le projet Firebase;
- activer les produits necessaires;
- fournir les credentials au backend Render.

### 24.4 Flux complet front <-> back <-> Firebase

1. L'utilisateur se connecte sur mobile/web.
2. Le client recupere un ID token Firebase.
3. Le client appelle l'API Render avec `Authorization: Bearer <idToken>`.
4. L'API Render verifie le token via `firebase-admin`.
5. L'API lit/ecrit dans PostgreSQL.
6. Si besoin, l'API declenche notification/email/SMS.
7. Le frontend affiche les donnees renvoyees par l'API.

Important:
- Le frontend ne doit pas avoir les secrets backend.
- Les operations metier critiques passent par ton API Render.

### 24.5 Variables d'environnement minimales

#### Backend (Render)
- `NODE_ENV=production`
- `PORT` (gere par Render)
- `DATABASE_URL`
- `CORS_ORIGIN` (URL web officielle)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `SENTRY_DSN`
- `EMAIL_PROVIDER_API_KEY`
- `SMS_PROVIDER_API_KEY`
- `JWT_AUDIENCE` (si utile)

#### Frontend web
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

Note:
- les variables `NEXT_PUBLIC_*` sont publiques par nature;
- ne jamais mettre de secrets prives cote front.

### 24.6 Configuration Render recommandee

**Service 1: API**
- Type: Web Service (Node)
- Build command: `npm ci && npm run build`
- Start command: `npm run start:prod`
- Health check path: `/health`
- Auto deploy: actif depuis branche `main` (ou `staging` selon flow)

**Service 2: Worker (optionnel)**
- Type: Background Worker
- Command: `npm run worker:start`
- Utilise la meme DB et memes secrets utiles.

**Database**
- Postgres Render OU externe (Neon/Supabase).
- Activer backup et connection pooling si dispo.

### 24.7 Checklist securite avant go-live

- [ ] HTTPS actif partout
- [ ] CORS limite aux domaines officiels
- [ ] Validation `zod` sur toutes les entrees API
- [ ] Rate limiting actif
- [ ] Secrets uniquement dans Render env vars
- [ ] Aucun secret dans repo Git
- [ ] Verification token Firebase cote backend active
- [ ] Roles et permissions testes (admin/delegate/student)
- [ ] Logs + Sentry fonctionnels
- [ ] Sauvegardes DB verifiees

### 24.8 Checklist connexion front/backend

- [ ] Le frontend pointe vers la bonne URL API
- [ ] L'auth Firebase renvoie bien un ID token
- [ ] Les requetes envoient `Authorization: Bearer`
- [ ] Le backend accepte les tokens valides et rejette les invalides
- [ ] Les erreurs API sont affichees proprement cote front
- [ ] Les timeouts/retries front sont configures

### 24.9 Environnements conseilles

- `dev` (local + services de test)
- `staging` (quasi prod)
- `prod` (utilisateurs reels)

Chaque environnement doit avoir:
- son URL API;
- sa base PostgreSQL;
- ses variables d'environnement;
- idealement son projet Firebase (au moins staging/prod separes si possible).

### 24.10 Plan concret pour aboutir au resultat (ordre execution)

1. Creer PostgreSQL managé.
2. Finaliser schema Prisma + migrations.
3. Deployer API sur Render avec `/health`.
4. Connecter API <-> PostgreSQL.
5. Configurer Firebase Auth + credentials backend.
6. Brancher frontend sur API Render.
7. Tester flux complet login -> requete protegee -> reponse.
8. Configurer notifications/email/SMS.
9. Activer monitoring + alertes.
10. Faire un go-live progressif (petit groupe beta puis ouverture).

Si ces 10 points sont valides, tu as une chaine complete front-back-cloud utilisable en production.

