# Kamplink - backend

API de Kamplink (nom de code interne: CampusLink), plateforme sociale academique pour les etudiants senegalais:
espaces et canaux par universite et filiere, documents de cours, opportunites (stages, emplois, bourses),
entreprises partenaires et moderation. Presentation complete: PRESENTATION.md.

**Statut**: code complet pour le MVP, compile (typecheck + build OK), mais jamais execute de bout en bout.
Les cles Firebase manquent, donc les routes protegees repondent 401 en local. Voir ETAPES.md.

## Principe central: la carte etudiante

La carte etudiante authentifie un etudiant: un numero de carte = un compte. L'etudiant televerse la photo
(stockage prive) et saisit le numero; un admin valide, aide par la liste officielle de l'universite si elle est importee.
La photo est supprimee a la decision, le numero reste sur le compte.

## Stack

NestJS 11, TypeScript, PostgreSQL + Prisma 6, Firebase Admin, Socket.IO, Upstash Redis (optionnel),
Sentry (optionnel), DOMPurify. Elasticsearch present mais inactif.

## Demarrage

Prerequis: Node.js, PostgreSQL 14+, un projet Firebase.

    npm install --legacy-peer-deps
    copy .env.example .env      (puis renseigner DATABASE_URL et les cles Firebase)
    npx prisma generate
    npm run prisma:migrate:deploy
    npm run seed
    npm run start:dev

API: http://localhost:3000/api/v1 (sante: /api/v1/health). Swagger: http://localhost:3000/api/docs (partiel).
Sans cles Firebase l'app demarre en developpement (routes protegees en 401); en production elle refuse de demarrer.

## Configuration (.env)

- DATABASE_URL: PostgreSQL (obligatoire)
- FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY: obligatoires
- FRONTEND_URL: origine CORS (defaut http://localhost:3001)
- ENFORCE_VERIFICATION: true = compte non verifie en lecture seule (apres creation du superadmin)
- SEED_ADMIN_FIREBASE_UID, SEED_ADMIN_PHONE: premier superadmin cree par le seed
- TRUST_PROXY: a definir derriere un reverse proxy (ex. 1)
- UPLOAD_DIR: dossier des fichiers prives (defaut ./storage)
- UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, SENTRY_DSN, ELASTICSEARCH_URL: optionnels

Ne jamais committer .env ni storage/ (ignores par .gitignore).

## Documentation

- PRESENTATION.md: le projet, son but, ses fonctionnalites
- explication/DOCUMENTATION_COMPLETE.md: architecture, roles, endpoints, regles metier, securite
- SUIVI.md: historique des lots, reste a faire, decisions
- ETAPES.md: mise en route, parcours de test, etapes jusqu'au deploiement
- archives/: anciens documents obsoletes

## Points d'attention

- Rien n'a ete teste avec de vrais jetons Firebase: premiere chose a faire.
- Les documents de cours sont de simples URL; seul l'upload des cartes existe.
- Stockage des photos local: disque persistant ou stockage objet prive requis en hebergement.
- Decision en attente: connexion des entreprises (OTP seul ou email et mot de passe).
- Ancienne base Kamplink (version plus avancee, sans le code): ne pas la supprimer avant d'avoir decide quoi en migrer.