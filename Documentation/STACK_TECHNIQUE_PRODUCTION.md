# kamplink — Stack technique de production (détaillée)

## 1) Objectif du document

Ce document definit la stack de production recommandee pour kamplink, sur l'ensemble du projet (mobile, web, backend, backoffice, data, securite, operations, croissance), avec:
- les technologies a utiliser;
- les packages principaux;
- le role de chaque composant;
- le pourquoi du choix;
- les alternatives possibles;
- les exigences de securite et d'exploitation.

L'objectif est de lancer proprement, sans sur-ingenierie, tout en gardant une base solide pour evoluer.
La landing n'est qu'un composant d'acquisition parmi d'autres, pas le coeur du document.

---

## 2) Principes de selection

- Priorite a la fiabilite et a la simplicite operationnelle.
- Optimise pour un budget de lancement faible.
- Bonne experience sur reseau mobile lent.
- Securite "by design": moins de logique critique cote client.
- Stack qui permet de scaler sans re-ecrire tout le produit.

---

## 3) Architecture globale cible (projet complet)

- **Canaux d'acquisition**: landing + contenu social + programmes ambassadeurs (optionnel techniquement, critique business).
- **Applications produit**: mobile (React Native/Expo) et web (Next.js).
- **Backend**: Firebase Cloud Functions (Node.js/TypeScript) pour la logique metier.
- **Donnees**: Firestore (temps reel) + Firebase Storage (fichiers).
- **Auth**: Firebase Authentication (SMS OTP + email selon cas).
- **Recherche**: Algolia (a activer quand le volume augmente).
- **Notifications**: FCM push + SMS provider pour cas critiques.
- **Monitoring**: Sentry + Firebase Analytics + logs Google Cloud.
- **CI/CD**: GitHub Actions + deploiements controles vers dev/staging/prod.
- **Conformite & gouvernance**: politiques de confidentialite, retention donnees, procedure incidents.
- **Monetisation**: offres sponsorisees, abonnements B2B, marketplace (phasee).

---

## 4) Frontend

### 4.1 Landing page (acquisition)

**Technologies**
- HTML/CSS/JS (ou Next.js static export si tu veux unifier plus tard).

**Packages minimaux**
- Pas obligatoire au debut (vanilla possible).
- Si migration Next.js: `next`, `react`, `react-dom`.

**Pourquoi**
- TTFB rapide, SEO correct, cout faible.
- Plus simple a maintenir au lancement.

**Points securite**
- CSP stricte.
- Headers de securite via Firebase Hosting.
- Aucun secret ni logique metier sensible cote client.

### 4.2 Application mobile

**Technologies**
- React Native + Expo (Android prioritaire).

**Packages recommandes**
- `expo`
- `react-native`
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `firebase` (SDK client)
- `zod` (validation schema)
- `react-hook-form` (gestion des formulaires)
- `@tanstack/react-query` (cache et etat reseau)
- `expo-notifications` (push)
- `expo-image-manipulator` (compression images)
- `expo-secure-store` (stockage local sensible)
- `sentry-expo` ou `@sentry/react-native` (erreurs)

**Pourquoi**
- Une codebase pour Android/iOS.
- Time-to-market rapide.
- Ecosysteme mature pour camera, notifications et build OTA.

### 4.3 Application web (produit + backoffice)

**Technologies**
- Next.js (App Router) + TypeScript.

**Packages recommandes**
- `next`, `react`, `react-dom`
- `typescript`
- `zod`
- `react-hook-form`
- `@tanstack/react-query`
- `firebase` (client) et `firebase-admin` (serveur/backoffice)
- `@sentry/nextjs`
- `tailwindcss` (optionnel mais pratique)

**Pourquoi**
- SEO pour pages publiques.
- Routes API utiles pour webhooks et backoffice.
- Bonne performance et structure claire.

---

## 5) Backend & logique metier

### 5.1 Runtime principal

**Technologies**
- Firebase Cloud Functions v2
- Node.js LTS (20 ou 22), TypeScript recommande.

**Packages recommandes**
- `firebase-functions`
- `firebase-admin`
- `zod` (validation d'entree)
- `pino` ou logs structurees standards
- `resend` ou `@sendgrid/mail` (emails transactionnels)
- `rate-limiter-flexible` (si endpoint HTTP expose)

**Pourquoi**
- Tres bonne integration avec Firestore/Auth/Storage.
- Facturation a l'usage.
- Facile a faire evoluer depuis MVP.

### 5.2 Patterns obligatoires cote serveur

- Validation stricte des payloads (`zod`) avant traitement.
- Sanitisation des champs texte.
- Idempotence des endpoints (eviter doublons).
- Rate limit par IP + email + fingerprint de device (si possible).
- Verification anti-bot (reCAPTCHA Enterprise/hCaptcha).
- Journalisation structuree des evenements critiques.

---

## 6) Base de donnees & stockage

### 6.1 Firestore

**Collections de depart**
- `users`
- `waitlist` (si conservee)
- `verificationRequests`
- `opportunities`
- `spaces` / `channels` / `posts` (selon modelisation finale)
- `reports` (signalements)

**Pourquoi**
- Temps reel natif.
- Offline cache mobile.
- Integration simple avec Auth et Functions.

**Regles securite (obligatoire)**
- Interdire ecriture directe client sur donnees sensibles.
- Autorisations basees sur `request.auth.uid` + roles.
- "Deny by default", n'ouvrir que le necessaire.

### 6.2 Firebase Storage

**Usage**
- Cartes etudiantes, avatars, documents PDF.

**Regles**
- Buckets/logical paths separes par usage.
- Acces restreint (ex: cartes uniquement admin + owner selon statut).
- Verification type MIME + taille max.

**Pourquoi**
- Robuste, simple, integre a Firebase.

---

## 7) Authentification et autorisation

**Technologies**
- Firebase Auth (SMS OTP + email/password ou magic-link selon besoin).
- Custom Claims pour roles (`admin`, `delegate`, `verifiedStudent`).

**Packages**
- `firebase` (client)
- `firebase-admin` (set claims cote serveur)

**Pourquoi**
- Rapide a mettre en place.
- Gestion session + tokens deja geree.

**Bonnes pratiques**
- Ne jamais faire confiance au role cote client.
- Verifier roles et droits dans chaque Function critique.
- Rotation et revocation des sessions en cas d'incident.

---

## 8) Messaging, email, notifications

### 8.1 Push

**Technologie**
- Firebase Cloud Messaging.

**Pourquoi**
- Natif avec Firebase, fiable pour Android.

### 8.2 Email transactionnel

**Technologie recommandee**
- Resend, SendGrid ou Postmark (pas Gmail personnel).

**Packages**
- `resend` ou `@sendgrid/mail` ou SDK Postmark.

**Pourquoi**
- Delivrabilite meilleure.
- Credentials geres proprement.
- Moins de risque de blocage.

### 8.3 SMS critique (hors OTP Firebase)

**Technologie**
- Termii ou Africa's Talking (a valider selon cout/qualite locale).

**Pourquoi**
- Couverture locale et support regional.

---

## 9) Recherche

**Technologie**
- Algolia (activation en phase 2/3).

**Packages**
- `algoliasearch`

**Pourquoi**
- Firestore n'est pas fait pour la recherche full-text.
- Recherche rapide par mots-cles, filtres, ranking.

---

## 10) Securite production (non negociable)

### 10.1 Secrets

- Tous les secrets en variables d'environnement (Firebase/Google Secret Manager).
- Aucun secret en dur dans le code.
- Rotation trimestrielle minimum.

### 10.2 API et endpoints

- CORS strict.
- Rate limiting.
- Anti-bot.
- Validation schema serveur.
- Logs d'audit.

### 10.3 Hosting headers (exemple)

- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` adaptee a Firebase/Next.

### 10.4 Donnees personnelles

- Consentement explicite avant collecte.
- Politique de retention (ex: suppression waitlist apres X mois).
- Procedure DSR (acces/suppression utilisateur).

---

## 11) Observabilite, qualite, exploitation

### 11.1 Monitoring

**Technologies**
- Sentry (front + back)
- Firebase Analytics
- Cloud Logging + alertes Google Cloud

**Pourquoi**
- Detecter vite les crashs et degradations.

### 11.2 CI/CD

**Technologies**
- GitHub Actions
- Firebase CLI
- Vercel (si Next.js web)

**Checks minimaux**
- lint
- typecheck
- tests unitaires critiques
- build
- deploiement staging avant prod

### 11.3 Environnements

- `dev`, `staging`, `prod` separes.
- Pas de test manuel sur prod.
- Feature flags pour activer progressivement.

---

## 12) Stack package par package (resume decisionnel)

- `firebase` -> SDK client (Auth/Firestore/Storage).  
  Pourquoi: integration native.
- `firebase-admin` -> operations serveur privilegiees.  
  Pourquoi: claims, verifications, acces securise.
- `firebase-functions` -> logique backend serverless.  
  Pourquoi: faible cout au depart, scalable.
- `zod` -> validation stricte des entrees/sorties.  
  Pourquoi: evite injections et donnees invalides.
- `react-hook-form` -> formulaires fiables et performants.  
  Pourquoi: UX propre + erreurs mieux gerees.
- `@tanstack/react-query` -> cache/retry/loading states.  
  Pourquoi: meilleure UX reseau lent.
- `@sentry/*` -> suivi erreurs front/back.  
  Pourquoi: debug et stabilite.
- `algoliasearch` -> recherche full-text.  
  Pourquoi: performance et pertinence.
- `expo-image-manipulator` -> compression images mobile.  
  Pourquoi: economie data et uploads rapides.
- `resend` / `@sendgrid/mail` -> emails transactionnels.  
  Pourquoi: meilleur que SMTP Gmail.

---

## 13) Ce qu'il faut eviter

- Secrets en dur dans JS/Functions.
- Ecritures Firestore sensibles directement depuis le client.
- Dependances inutiles "pour plus tard".
- Monolithes complexes trop tot.
- Absence de staging et de tests minimaux.

---

## 14) Plan d'adoption (ordre recommande)

1. Corriger securite immediate (secrets, endpoints, regles Firestore).
2. Passer Functions en TypeScript + validation `zod`.
3. Mettre monitoring (Sentry + alertes).
4. Structurer CI/CD + environnements.
5. Ajouter recherche Algolia quand volume le justifie.
6. Ajouter paiements marketplace en phase 3 seulement.

---

## 15) Conclusion

La stack recommandee est volontairement pragmatique:
- assez robuste pour une production reelle;
- assez simple pour une petite equipe;
- assez evolutive pour passer de MVP a scale regional.

Le vrai levier n'est pas d'empiler des technologies, mais de verrouiller:
- la securite;
- la qualite des donnees;
- la vitesse d'iteration produit;
- l'observabilite operationnelle.

---

## 16) Cadrage "projet total" (au-dela de la stack code)

### 16.1 Modules produit a couvrir absolument

- **Identite et verification etudiante**: onboarding, preuves, validation, statut.
- **Communaute structuree**: espaces, canaux, moderation, signalements.
- **Opportunites**: ingestion, qualification, publication, expiration, anti-fraude.
- **Documents academiques**: upload, organisation, droits d'acces, recherche.
- **Profil et reputation**: contributions, badges, historique, niveau de confiance.
- **Backoffice admin/delegues**: validation, moderation, traitement incidents.
- **Notifications multi-canaux**: push prioritaire, SMS critique, email transactionnel.
- **Marketplace (phase 3)**: catalogue, paiement local, litiges, commissions.

### 16.2 Gouvernance, legal et confiance

- **RGPD/loi locale**: consentement explicite, finalites, minimisation de donnees.
- **Retention**: duree de conservation par type de donnee.
- **DSR**: export/suppression compte utilisateur sur demande.
- **KYC interne**: procedure de verification + preuves d'audit.
- **Terms & policy**: versionnees, acceptees explicitement, historisees.

### 16.3 Securite organisationnelle

- **IAM minimal**: acces par role, principe du moindre privilege.
- **Gestion des secrets**: rotation, inventaire, revoke en incident.
- **Plan incident**: detection, confinement, communication, post-mortem.
- **Revues de securite**: checklist trimestrielle et tests de penetration legers.

### 16.4 Exploitation et fiabilite

- **SLO de base**: disponibilite API, latence mediane, taux d'erreur.
- **Runbooks**: procedures echec deploy, surcharge, incident SMS/email.
- **Alerting**: erreurs critiques, hausse fraude, baisse delivrabilite.
- **Backups et restauration**: tests periodiques, RPO/RTO cibles.

### 16.5 Economie et pilotage

- **Unit economics**: cout par utilisateur actif, cout verification, cout notif.
- **KPI produit**: retention J7/J30, activation, conversion opportunites.
- **KPI business**: MRR B2B, taux de renouvellement, panier moyen marketplace.
- **KPI qualite**: delai de moderation, taux de fraude detectee, plaintes.

### 16.6 Roadmap conseillee

- **Phase 1 (MVP robuste)**: verification + communaute + opportunites + docs.
- **Phase 2 (scaling local)**: automatisation moderation, recherche avancee, B2B.
- **Phase 3 (regionalisation)**: marketplace, paiements, extension geographique.

Ce cadrage garantit que le projet est traite comme un produit complet, pas comme une simple vitrine web.

---

## 17) Compatibilite packages (anti-problemes long terme)

Cette section sert de garde-fou pour eviter les conflits de versions, les regressions silencieuses et les migrations douloureuses.

### 17.1 Regle d'or

- Toujours utiliser des versions **LTS stables** (Node, Expo SDK, Next.js stable).
- Eviter les upgrades massifs simultanes (ex: Node + Expo + Firebase le meme jour).
- Mettre en place une politique de mise a jour cadencee (mensuelle mineure, trimestrielle majeure).
- Tester chaque upgrade en `staging` avant `prod`.

### 17.2 Matrice de compatibilite recommandee (baseline)

> Important: les numeros exacts peuvent evoluer. Le principe est de verrouiller des couples compatibles puis d'upgrader par vagues controlees.

- **Node.js backend**: `20.x LTS` (ou `22.x LTS` si toute la toolchain est validee).
- **Cloud Functions**: `firebase-functions` v2/v4+ (selon release stable) avec `firebase-admin` meme generation majeure recente.
- **TypeScript backend**: `5.x`.
- **Mobile**: Expo SDK stable (une seule version pour toute l'equipe).
- **React Native**: version imposee par Expo SDK (ne pas forcer manuellement).
- **Web**: Next.js stable + React stable compatible (respecter la matrice officielle Next/React).
- **Validation**: `zod` meme version majeure sur front/back.
- **Data fetching**: `@tanstack/react-query` meme majeure sur web/mobile pour coherence.
- **Monitoring**: Sentry SDK specifique plateforme (Next, RN), meme majeure quand possible.

### 17.3 Combinaisons sures par couche

**A. Firebase (backend)**
- `firebase-admin` et `firebase-functions` doivent rester sur des versions recentes et compatibles.
- Eviter de mixer APIs legacy et APIs v2 dans les memes modules critiques.
- Verifier runtime supporte par Firebase avant upgrade Node.

**B. Expo / React Native (mobile)**
- Expo dicte React Native: ne jamais upgrader RN independamment d'Expo.
- Suivre `expo doctor` apres chaque changement de dependances natives.
- Ajouter uniquement des libs officiellement supportees Expo quand possible.

**C. Next.js (web/backoffice)**
- Respect strict du couple Next.js <-> React recommande.
- Eviter d'activer des features experimentales en prod sans besoin fort.
- Garder `eslint` et `typescript` dans la plage supportee par Next.

### 17.4 Politique de versions (concrete)

- Utiliser des versions **fixees** ou **tilde (`~`)** pour les libs critiques:
  - Auth, DB, paiement, security, observability.
- Eviter `^` sur les packages critiques si tu veux zero surprise.
- Autoriser `^` seulement sur libs utilitaires non critiques.
- Verrouiller les lockfiles (`package-lock.json` / `pnpm-lock.yaml`) et les versionner.

### 17.5 Dependance management recommande

- Preferer un monorepo (`apps/mobile`, `apps/web`, `apps/functions`, `packages/shared`).
- Centraliser les versions partagees via workspace (pnpm ou npm workspaces).
- Mettre `zod`, types communs, DTO dans `packages/shared` pour eviter les derives.
- Ajouter `overrides` (ou `resolutions`) uniquement pour corriger un conflit documente.

### 17.6 Strategie de mise a jour sans casse

1. Creer branche `chore/deps-YYYY-MM`.
2. Upgrader une couche a la fois (backend puis web puis mobile).
3. Lancer tests + build + smoke tests sur staging.
4. Verifier logs d'erreurs (Sentry/Cloud logs) 24-48h.
5. Fusionner en prod uniquement si KPI stables.

### 17.7 Checklist de compatibilite avant merge

- [ ] Build web OK
- [ ] Build mobile OK (Android prioritaire)
- [ ] Deploy functions OK
- [ ] Tests auth/login OK
- [ ] Tests upload docs/images OK
- [ ] Tests notifications push/email/SMS OK
- [ ] Aucun pic d'erreurs Sentry
- [ ] Aucun warning critique `npm audit`/SCA sur paquets exposes

### 17.8 Packages critiques a surveiller en priorite

- `firebase-admin`
- `firebase-functions`
- `firebase` (SDK client)
- `expo` + dependances natives Expo
- `next` / `react` / `react-dom`
- SDK paiement (Wave/Orange Money via client HTTP)
- SDK messaging/email (FCM, Resend/SendGrid)
- SDK monitoring (Sentry)

### 17.9 Ce qu'il faut absolument eviter

- Mettre a jour Expo et Next.js en meme temps.
- Forcer des peer dependencies avec `--force` en continu.
- Ignorer des warnings de compatibilite runtime.
- Avoir des versions de `zod`/types divergentes entre web, mobile et backend.
- Ajouter des packages non maintenus (derniere release trop ancienne, issues securite ouvertes).

### 17.10 Rythme recommande

- **Hebdo**: patches securite uniquement.
- **Mensuel**: mises a jour mineures controlees.
- **Trimestriel**: une migration majeure max (ex: Expo SDK ou Next major), jamais deux.

Avec cette discipline, tu reduis fortement les incidents de compatibilite sur 12-24 mois.

---

## 18) Set initial de versions recommande (baseline stable)

Objectif: partir avec une base coherente, testee et facile a maintenir.

### 18.1 Backend `apps/functions` (Firebase Functions)

**Runtime**
- Node.js: `20.x LTS`
- TypeScript: `5.6.x`

**Packages**
- `firebase-functions`: `^5.1.1`
- `firebase-admin`: `^13.0.0`
- `zod`: `^3.23.8`
- `pino`: `^9.4.0`
- `resend`: `^4.0.0` (ou `@sendgrid/mail` `^8.1.3`)
- `rate-limiter-flexible`: `^5.0.4`

**Dev packages**
- `typescript`: `5.6.3`
- `eslint`: `9.12.0`
- `@typescript-eslint/parser`: `8.8.1`
- `@typescript-eslint/eslint-plugin`: `8.8.1`

### 18.2 Web `apps/web` (Next.js)

**Core**
- `next`: `15.0.0`
- `react`: `19.0.0`
- `react-dom`: `19.0.0`
- `typescript`: `5.6.3`

**App**
- `firebase`: `^11.0.1`
- `zod`: `^3.23.8`
- `react-hook-form`: `^7.53.0`
- `@tanstack/react-query`: `^5.59.0`
- `@sentry/nextjs`: `^8.35.0`

**Style (optionnel)**
- `tailwindcss`: `3.4.13`
- `postcss`: `8.4.47`
- `autoprefixer`: `10.4.20`

### 18.3 Mobile `apps/mobile` (Expo / React Native)

**Core (laisser Expo imposer les versions natives)**
- `expo`: `~52.0.0`
- `react`: `19.0.0`
- `react-native`: version fournie par Expo SDK 52

**App**
- `firebase`: `^11.0.1`
- `zod`: `^3.23.8`
- `react-hook-form`: `^7.53.0`
- `@tanstack/react-query`: `^5.59.0`
- `expo-notifications`: via `expo install`
- `expo-image-manipulator`: via `expo install`
- `expo-secure-store`: via `expo install`
- `@sentry/react-native`: `^6.5.0`

**Navigation**
- `@react-navigation/native`: `^6.1.18`
- `@react-navigation/native-stack`: `^6.11.0`
- dependances react-navigation installees via `expo install`

### 18.4 Packages partages `packages/shared`

- `zod`: `^3.23.8`
- `typescript`: `5.6.3`
- `tsup` (si build lib): `^8.3.0`

**Pourquoi partager**
- memes schemas de validation front/back;
- meme modele DTO;
- reduction des bugs de contrat API.

### 18.5 Regles de pinning recommandees

- Critiques (auth/db/functions/monitoring/paiement): versions fixes ou `~`.
- UI/utilitaires non critiques: `^` accepte.
- Toujours versionner les lockfiles.

### 18.6 Commandes d'installation conseillees (npm workspaces)

> Adapte ces commandes a ta structure finale de monorepo.

```bash
# Backend
npm install -w apps/functions firebase-functions@^5.1.1 firebase-admin@^13.0.0 zod@^3.23.8 pino@^9.4.0 resend@^4.0.0 rate-limiter-flexible@^5.0.4
npm install -D -w apps/functions typescript@5.6.3 eslint@9.12.0 @typescript-eslint/parser@8.8.1 @typescript-eslint/eslint-plugin@8.8.1

# Web
npm install -w apps/web next@15.0.0 react@19.0.0 react-dom@19.0.0 firebase@^11.0.1 zod@^3.23.8 react-hook-form@^7.53.0 @tanstack/react-query@^5.59.0 @sentry/nextjs@^8.35.0
npm install -D -w apps/web typescript@5.6.3 tailwindcss@3.4.13 postcss@8.4.47 autoprefixer@10.4.20

# Mobile (les libs natives via expo install)
npm install -w apps/mobile firebase@^11.0.1 zod@^3.23.8 react-hook-form@^7.53.0 @tanstack/react-query@^5.59.0 @react-navigation/native@^6.1.18 @react-navigation/native-stack@^6.11.0 @sentry/react-native@^6.5.0
```

Puis dans `apps/mobile`:

```bash
npx expo install expo-notifications expo-image-manipulator expo-secure-store react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
```

### 18.7 Verification obligatoire apres install

- `npm run build` (web + functions)
- `npm run typecheck` (tous les apps/packages)
- `npx expo doctor` (mobile)
- `firebase emulators:start` (functions/firestore/auth local)
- smoke test auth + upload + notification

### 18.8 Note importante

Avant de figer definitivement ces versions en production, verifier:
- matrice officielle Next.js <-> React;
- compatibilite Expo SDK <-> React Native;
- support runtime Node par Firebase Functions.

Le principe de cette baseline est de partir sur des couples modernes et stables, puis d'avancer par upgrades progressifs controles.

---

## 19) Evolutions recommandees (version PostgreSQL-first)

Tu as indique que tu es plus a l'aise avec PostgreSQL.  
Cette trajectoire devient donc la reference officielle: **PostgreSQL en base principale**, Firebase utilise de facon selective.

### 19.1 Positionnement cible

- **Source of truth metier**: PostgreSQL.
- **API metier principale**: backend Node.js TypeScript (NestJS ou Fastify).
- **Firebase garde**:
  - Auth (si tu veux OTP rapide),
  - FCM (push),
  - Storage (optionnel) ou remplacement par S3-compatible.
- **Recherche**: Postgres Full-Text au debut, puis Meilisearch/Algolia si besoin.

### 19.2 Stack technique cible avec PostgreSQL

**Backend**
- `nestjs` (ou `fastify` si tu veux plus minimal)
- `prisma` + `@prisma/client`
- `pg`
- `zod` (validation DTO aux frontieres)
- `bullmq` + `ioredis` (jobs/queues)
- `pino` + `pino-pretty` (logs)
- `@sentry/node` (observabilite)

**Base de donnees**
- PostgreSQL 16+
- Migrations versionnees via Prisma Migrate
- Indexation explicite (B-Tree/GIN), contraintes FK, transactions ACID

**Cache et file de jobs**
- Redis (cache session, anti-spam, jobs async)

**Front**
- Web: Next.js + React Query + Zod
- Mobile: Expo + React Query + Zod

### 19.3 Repartition des responsabilites (finale)

- **PostgreSQL**: utilisateurs, profils, opportunites, moderation, reputation, transactions marketplace.
- **Redis**: rate limiting, sessions courtes, queue d'envoi notifications/emails.
- **Firebase Auth (option A)**: OTP SMS et gestion identite.
- **Auth maison (option B)**: si tu veux tout centraliser plus tard (JWT + OTP provider).
- **FCM**: push mobile.
- **Email provider**: Resend/SendGrid/Postmark.
- **SMS provider**: Termii/Africa's Talking (hors OTP Firebase).

### 19.4 Plan d'evolution par phases (projet total)

**Phase A - Fondations (0-2 mois)**
- Monorepo propre (`apps/web`, `apps/mobile`, `apps/api`, `packages/shared`).
- API NestJS/Fastify + PostgreSQL + Prisma.
- Auth initiale (Firebase Auth ou OTP provider) + roles.
- Modules: users, profiles, opportunities, documents metadata.
- Observabilite de base (Sentry + logs structurees + healthchecks).

**Phase B - Production robuste (2-6 mois)**
- Moderation complete (signalements, actions admin, audit logs).
- Notifications asynchrones via queue (BullMQ).
- Anti-abus: rate limit IP/user + anti-bot.
- Sauvegardes auto PostgreSQL + test de restauration mensuel.
- CI/CD complet dev/staging/prod.

**Phase C - Scale local (6-12 mois)**
- Recherche avancee (Postgres FTS -> Meilisearch/Algolia si necessaire).
- Materialized views pour dashboards admin.
- Optimisation perf SQL (index, EXPLAIN ANALYZE, partitionnement si besoin).
- Debut monetisation B2B (offres sponsorisees).

**Phase D - Scale regional (12+ mois)**
- Event-driven plus avance (outbox pattern).
- Replication read-only PostgreSQL.
- Marketplace complete (paiements, litiges, escrow logique).
- Data warehouse (BigQuery ou ClickHouse/Postgres replica analytique).

### 19.5 Pourquoi PostgreSQL-first est un bon choix pour toi

- Tu es deja a l'aise -> execution plus rapide et moins d'erreurs.
- Meilleur controle schema/relations complexes (marketplace, moderation, paiements).
- SQL puissant pour reporting metier.
- Moins de surprises de modelisation qu'un systeme 100% document.

### 19.6 Compromis de cette strategie

- Un peu plus d'operations infra qu'un Firebase-only.
- Plus de code backend a maintenir.
- Besoin de discipline forte sur migrations et perf SQL.

### 19.7 Versions initiales conseillees (PostgreSQL path)

**API**
- `nestjs`: `^10.4.0`
- `@nestjs/platform-fastify`: `^10.4.0`
- `prisma`: `^5.21.1`
- `@prisma/client`: `^5.21.1`
- `pg`: `^8.13.0`
- `zod`: `^3.23.8`
- `bullmq`: `^5.21.0`
- `ioredis`: `^5.4.1`
- `pino`: `^9.4.0`
- `@sentry/node`: `^8.35.0`

**Base**
- PostgreSQL `16.x`
- Redis `7.x`

### 19.8 Regle de decision Firebase vs PostgreSQL

Utilise PostgreSQL par defaut pour toute logique metier critique.  
Utilise Firebase uniquement si le service apporte un avantage net de vitesse ou de fiabilite (Auth OTP, FCM).

En pratique, pour ton projet complet, la meilleure strategie est **hybride controlee**, pas "tout Firebase".

---

## 20) Front mobile: React Native vs Flutter (decision design)

### 20.1 Decision recommandee

Pour kamplink, la recommandation est: **React Native + Expo**.  
Raison principale: coherence avec la stack TypeScript du projet (web + backend), vitesse d'execution et maintenance simplifiee.

### 20.2 Question cle: "React Native peut-il gerer un tres bon design ?"

Oui. React Native permet de produire une interface premium, moderne et fluide, y compris:
- transitions riches et animations complexes;
- micro-interactions (haptics, gestures, feedback visuel);
- theming complet (light/dark, branding, variations par contexte);
- interfaces performantes sur Android d'entree de gamme si optimisation correcte.

Conclusion: la qualite design depend surtout du design system et de l'execution, pas du framework seul.

### 20.3 Stack design recommandee pour React Native

- `react-native-reanimated` -> animations fluides et robustes.
- `react-native-gesture-handler` -> gestures avances.
- `react-native-safe-area-context` -> rendu propre sur tous ecrans.
- `react-native-svg` -> icones/illustrations vectorielles.
- `@shopify/flash-list` -> listes performantes.
- `expo-linear-gradient`, `expo-blur`, `expo-haptics` -> polish visuel.
- `nativewind` ou `tamagui` ou `restyle` -> systeme UI coherent (choisir un seul).

### 20.4 Regles design system (obligatoires)

- Definir des design tokens globaux: couleurs, typo, spacing, radius, elevation.
- Centraliser les composants de base: `Button`, `Input`, `Card`, `Sheet`, `Badge`.
- Interdire les styles inline ad hoc dans les ecrans critiques.
- Uniformiser les animations (durees, easing, courbes).
- Integrer accessibilite des le debut (contraste, tailles touch, labels).

### 20.5 Checklist qualite UI avant release

- [ ] Navigation tactile fluide sans jank visible
- [ ] Temps de rendu stable sur Android entree de gamme
- [ ] Cohesion visuelle complete (tokens respectes)
- [ ] Etats UX complets (loading, empty, error, success)
- [ ] Accessibilite de base validee (contraste, focus, lecteurs ecran)
- [ ] Tests dark mode / petits ecrans / reseau lent

### 20.6 Quand Flutter peut etre preferable

Flutter devient pertinent si:
- l'equipe est majoritairement experte Dart;
- tu vises des interfaces tres custom avec pipeline design 100% Flutter;
- tu acceptes de separer plus fortement la stack mobile du reste TypeScript.

Dans le contexte actuel de kamplink, React Native reste le meilleur compromis global.

