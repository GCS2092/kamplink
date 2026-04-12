# kamplink — Backend Ready for Production v1

Checklist operationnelle a cocher pour garantir un backend coherent, securise et maintenable.

Mode d'emploi:
- `[ ]` non fait
- `[x]` fait
- Priorite: `P0` (bloquant), `P1` (important), `P2` (optimisation)

---

## 1) Architecture et structure

- [ ] **P0** Dossier backend unique et clair (`backend/`)
- [ ] **P0** Architecture MVC appliquee sur tous les modules
- [ ] **P0** Separation nette `controller / service / repository / dto`
- [ ] **P1** Convention de nommage documentee et respectee
- [ ] **P1** Module par domaine metier (users, profiles, opportunities, etc.)
- [ ] **P2** ADR (Architecture Decision Records) pour decisions majeures

---

## 2) API et contrats

- [ ] **P0** Prefix API versionne (`/v1`)
- [ ] **P0** Spec OpenAPI/Swagger exposee et a jour
- [ ] **P0** Format erreur standard (`code`, `message`, `details`, `requestId`)
- [ ] **P0** Validation d'entree sur 100% des endpoints d'ecriture
- [ ] **P1** Pagination standard sur endpoints list
- [ ] **P1** Idempotence sur endpoints critiques (inscription, actions sensibles)
- [ ] **P2** Deprecation policy documentee (cycle de suppression endpoints)

---

## 3) Authentification et autorisation

- [ ] **P0** Verification token Firebase cote backend active
- [ ] **P0** Aucun endpoint sensible accessible sans guard auth
- [ ] **P0** RBAC centralise (`admin`, `delegate`, `student`)
- [ ] **P0** Ownership checks appliques sur ressources utilisateur
- [ ] **P1** Matrice permissions (role x action x ressource) documentee
- [ ] **P1** Tests automatiques auth + role + ownership
- [ ] **P2** Journalisation des refus d'autorisation (audit securite)

---

## 4) Base de donnees PostgreSQL

- [ ] **P0** PostgreSQL managé configure (staging + prod)
- [ ] **P0** Migrations Prisma versionnees et relues
- [ ] **P0** Process `prisma migrate deploy` en CI/CD
- [ ] **P0** Contraintes DB critiques (FK, unique, not null) en place
- [ ] **P1** Index sur requetes frequentes (lecture/liste/recherche)
- [ ] **P1** Politique de migration backward-compatible (expand/contract)
- [ ] **P1** Rollback migration documente
- [ ] **P2** Revue performance SQL trimestrielle (`EXPLAIN ANALYZE`)

---

## 5) Secrets et configuration

- [ ] **P0** Zero secret dans le repo Git
- [ ] **P0** Secrets uniquement via env vars Render
- [ ] **P0** Environnements separes (`dev`, `staging`, `prod`)
- [ ] **P1** Rotation periodique des secrets (trimestrielle min)
- [ ] **P1** Inventaire des secrets a jour
- [ ] **P2** Procedure "secret compromise" documentee

---

## 6) Securite applicative

- [ ] **P0** `helmet` actif
- [ ] **P0** CORS strict (pas de `*` en prod)
- [ ] **P0** Rate limiting actif (IP + user)
- [ ] **P0** Limite taille payload et upload
- [ ] **P1** Anti-bot/Captcha sur endpoints cibles
- [ ] **P1** Sanitisation des champs texte utilisateur
- [ ] **P1** Protection brute-force login/OTP
- [ ] **P2** Revue OWASP Top 10 semestrielle

---

## 7) Donnees sensibles et conformite

- [ ] **P0** Classification des donnees sensibles documentee
- [ ] **P0** Regle de minimisation des donnees appliquee
- [ ] **P0** Consentement explicite collecte donnees (si applicable)
- [ ] **P1** Politique de retention par type de donnee
- [ ] **P1** Procedure suppression/export utilisateur (DSR) operationnelle
- [ ] **P1** Logs d'acces admin sur donnees sensibles
- [ ] **P2** Revue legale periodique (mentions/policies)

---

## 8) Jobs asynchrones (sans Redis)

- [ ] **P0** Table SQL `jobs` en place (`pending`, `processing`, `done`, `failed`)
- [ ] **P0** Worker Render stable
- [ ] **P1** Retry + backoff pour jobs echoues
- [ ] **P1** Dead-letter strategy (jobs en echec permanent)
- [ ] **P1** Idempotence jobs (pas de doublons critiques)
- [ ] **P2** Dashboard jobs (queue health)

---

## 9) Fichiers, emails, notifications

- [ ] **P0** Upload securise (MIME, taille, extension)
- [ ] **P0** URLs signees pour acces prive
- [ ] **P1** Token FCM stocke et invalide correctement
- [ ] **P1** Templates email versionnes
- [ ] **P1** Logs de livraison email/SMS
- [ ] **P2** Fallback provider email/SMS documente

---

## 10) Observabilite et operations

- [ ] **P0** Logging structure JSON (`pino`)
- [ ] **P0** Correlation ID (`x-request-id`) de bout en bout
- [ ] **P0** Sentry actif (API + worker)
- [ ] **P0** Dashboard erreurs 5xx + latence
- [ ] **P1** Alertes actionnables (5xx, latence, jobs, auth failures)
- [ ] **P1** SLO definis (dispo, latence, taux erreur)
- [ ] **P2** Post-mortem template pret

---

## 11) Tests et qualite

- [ ] **P0** Tests unitaires sur services metier critiques
- [ ] **P0** Tests integration sur endpoints sensibles
- [ ] **P0** Smoke tests pre-deploy (login, endpoint protege, write critique)
- [ ] **P1** Tests de non-regression permissions
- [ ] **P1** Coverage minimale sur modules coeur (objectif interne)
- [ ] **P2** Tests charge basiques avant go-live large

---

## 12) CI/CD et deploiement

- [ ] **P0** Pipeline CI: lint + test + build
- [ ] **P0** Deploy staging obligatoire avant prod
- [ ] **P0** Migration DB executee en pipeline
- [ ] **P0** Healthcheck `/health` valide en staging/prod
- [ ] **P1** Approval manuelle avant prod
- [ ] **P1** Rollback release documente
- [ ] **P2** Release notes systematiques

---

## 13) Runbooks incidents (obligatoire)

- [ ] **P0** Runbook panne DB
- [ ] **P0** Runbook echec migration
- [ ] **P0** Runbook incident auth/token
- [ ] **P1** Runbook spam/abus
- [ ] **P1** Runbook provider email/SMS KO
- [ ] **P1** Runbook rollback applicatif
- [ ] **P2** Exercices de simulation incident (tabletop)

---

## 14) Go-live progressif (strategie)

- [ ] **P0** Beta restreinte (petit groupe) avant ouverture large
- [ ] **P0** Monitoring renforce pendant beta
- [ ] **P1** Criteres go/no-go definis
- [ ] **P1** Plan communication incident utilisateur
- [ ] **P2** Feature flags pour activation graduelle

---

## 15) Score de readiness (auto-evaluation)

Calcule ton score:
- P0: nombre de cases cochees / total P0
- P1: nombre de cases cochees / total P1
- P2: nombre de cases cochees / total P2

Interpreation:
- **Pret prod minimum**: 100% P0 et >= 70% P1
- **Pret prod solide**: 100% P0 et >= 90% P1
- **Pret scale**: 100% P0, >= 90% P1 et >= 60% P2

---

## 16) Priorite immediate recommandee

Ordre d'execution:
1. Completer tout le `P0`
2. Fermer les `P1` securite + DB + CI/CD
3. Lancer beta restreinte
4. Finaliser `P1` restants
5. Traiter `P2` en continu

