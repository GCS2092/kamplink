# kamplink — Suivi hebdo backend (execution)

Utilise ce fichier chaque semaine pour piloter l'avancement reel.

Regles:
- une ligne = une action verifiable
- ajoute une date et un statut
- bloqueurs explicites obligatoires

---

## Semaine 1 — Bootstrap

- [ ] Date:
- [ ] Dossier `backend/` cree et projet NestJS lance
- [ ] Variables `.env.local` configurees
- [ ] Connexion PostgreSQL fonctionnelle
- [ ] Prisma init + migration `init` appliquee
- [ ] Endpoint `/health` operationnel
- [ ] **Bloqueurs de la semaine:**
- [ ] **Decision prise:**

## Semaine 2 — Auth et securite base

- [ ] Date:
- [ ] Firebase Auth configure (provider choisi)
- [ ] Verification ID token backend fonctionnelle
- [ ] Guards auth/roles en place
- [ ] `helmet` + CORS strict + throttling actifs
- [ ] Tests endpoint protege OK
- [ ] **Bloqueurs de la semaine:**
- [ ] **Decision prise:**

## Semaine 3 — Modules coeur v1

- [ ] Date:
- [ ] Module `users` MVC complet
- [ ] Module `profiles` MVC complet
- [ ] DTO/validation `zod` sur endpoints ecriture
- [ ] Tests unitaires critiques en place
- [ ] **Bloqueurs de la semaine:**
- [ ] **Decision prise:**

## Semaine 4 — Opportunites + documents

- [ ] Date:
- [ ] Module `opportunities` complet
- [ ] Module `documents` complet
- [ ] Upload securise (MIME/taille/URL signee)
- [ ] Logs actions critiques en place
- [ ] **Bloqueurs de la semaine:**
- [ ] **Decision prise:**

## Semaine 5 — Moderation + jobs SQL

- [ ] Date:
- [ ] Module `moderation` + `reports` operationnel
- [ ] Table SQL `jobs` active
- [ ] Worker de traitement jobs actif (sans Redis)
- [ ] Retry/backoff minimum implementes
- [ ] **Bloqueurs de la semaine:**
- [ ] **Decision prise:**

## Semaine 6 — Render staging

- [ ] Date:
- [ ] API deploye sur Render staging
- [ ] Variables env staging completes
- [ ] `prisma migrate deploy` en staging OK
- [ ] Smoke test staging OK
- [ ] **Bloqueurs de la semaine:**
- [ ] **Decision prise:**

## Semaine 7 — Observabilite

- [ ] Date:
- [ ] Sentry API/worker actif
- [ ] Dashboards 5xx/latence consultables
- [ ] Alertes critiques configurees
- [ ] Correlation ID en logs active
- [ ] **Bloqueurs de la semaine:**
- [ ] **Decision prise:**

## Semaine 8 — CI/CD et pre-prod

- [ ] Date:
- [ ] Pipeline CI (lint/typecheck/test/build) vert
- [ ] Deploy staging auto
- [ ] Gate manuelle avant prod active
- [ ] Runbooks P0 rediges
- [ ] **Bloqueurs de la semaine:**
- [ ] **Decision prise:**

## Semaine 9 — Go-live beta

- [ ] Date:
- [ ] Deploy prod initial effectue
- [ ] Beta restreinte ouverte
- [ ] Monitoring renforce 72h
- [ ] Incident process teste une fois
- [ ] **Bloqueurs de la semaine:**
- [ ] **Decision prise:**

---

## Tableau global (a mettre a jour chaque semaine)

- [ ] % P0 completes:
- [ ] % P1 completes:
- [ ] % P2 completes:
- [ ] Risque principal actuel:
- [ ] Priorite semaine prochaine:

