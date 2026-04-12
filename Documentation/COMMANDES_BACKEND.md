# kamplink — Commandes backend (ordre progressif)

Ce fichier contient les commandes a executer dans l'ordre pour construire le backend du debut a la fin.

Hypotheses:
- monorepo avec dossier `backend`
- PostgreSQL heberge (recommande) ou local sans Docker
- Render pour l'hebergement API

---

## 0) Pre-requis

Verifier versions:
```bash
node -v
npm -v
git --version
```

---

## 1) Initialisation du backend

Depuis la racine du projet:
```bash
npx @nestjs/cli new backend --package-manager npm
cd backend
```

Installer dependances backend:
```bash
npm install @nestjs/platform-fastify @nestjs/config @nestjs/throttler prisma@6.16.3 @prisma/client@6.16.3 zod nestjs-pino pino node-cron firebase-admin @sentry/node helmet
```

Installer dev deps:
```bash
npm install -D typescript ts-node eslint prettier
```

Ajouter scripts utiles (si absents dans `package.json`):
```bash
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.prisma:generate="prisma generate"
npm pkg set scripts.prisma:migrate:dev="prisma migrate dev"
npm pkg set scripts.prisma:migrate:deploy="prisma migrate deploy"
npm pkg set scripts.prisma:studio="prisma studio"
```

---

## 2) Prisma + PostgreSQL

Initialiser Prisma:
```bash
npx prisma init
```

Configurer `.env`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
```

Creer une premiere migration:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

Reset DB dev (si tu dois repartir propre):
```bash
npx prisma migrate reset
```

Ouvrir Prisma Studio:
```bash
npx prisma studio
```

---

## 3) Variables d'environnement API

Copier le template:
```bash
cp .env.example .env.local
```

Creer `.env.local` dans `backend`:
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://...
CORS_ORIGIN=http://localhost:3000
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SENTRY_DSN=...
EMAIL_PROVIDER_API_KEY=...
SMS_PROVIDER_API_KEY=...
```

---

## 4) Lancer API localement

Mode dev:
```bash
npm run start:dev
```

Build production local:
```bash
npm run build
npm run start:prod
```

---

## 5) Setup Firebase (commande utile)

Installer Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
```

Notes:
- activer Auth et FCM dans Firebase Console;
- recuperer credentials service account pour backend.

---

## 6) Qualite et verification avant deploy

Lint + typecheck + tests:
```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Migration pre-deploy:
```bash
npx prisma migrate deploy
```

---

## 7) Deploiement Render (API)

Build command (Render):
```bash
npm ci && npm run build
```

Start command (Render):
```bash
npx prisma migrate deploy && npm run start:prod
```

Health endpoint a verifier:
```txt
GET /health
```

---

## 8) Variables Render a renseigner

Dans dashboard Render -> Environment:
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

## 9) Frontend -> API

Web (`.env` front):
```env
NEXT_PUBLIC_API_URL=https://ton-api.onrender.com
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
```

Verifier:
- login Firebase OK
- token Bearer envoye vers API
- endpoint protege repond 200
- endpoint health repond 200:
```bash
curl https://ton-api.onrender.com/health
```

---

## 10) Routine progressive (hebdomadaire)

Chaque semaine:
```bash
# dev
npm run start:dev

# avant merge
npm run lint && npm run typecheck && npm run test && npm run build

# si schema modifie
npx prisma migrate dev --name "<nom_changement>"
npx prisma generate
```

Chaque deploy:
```bash
npx prisma migrate deploy
```

---

## 11) Commandes incidents (rapide)

Verifier logs Render:
- Dashboard Render -> Logs service API

Verifier erreurs Sentry:
- Dashboard Sentry -> Project API

Verifier DB:
```bash
npx prisma studio
```

Verifier migration appliquee:
```bash
npx prisma migrate status
```

---

## 12) Definition de progression reussie

Tu progresses correctement si:
- Semaine 1-2: API + DB + auth token verification OK
- Semaine 3-4: users/profiles/opportunities CRUD + roles OK
- Semaine 5-6: docs/posts/moderation + protections OK
- Semaine 7-8: deploy stable Render + monitoring + checklist go-live OK

