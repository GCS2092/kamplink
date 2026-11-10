# Kamplink (CampusLink) - Documentation du backend

> Derniere mise a jour: 10 novembre 2026
> Statut: **code complet pour le MVP, compile, mais non teste de bout en bout** (cles Firebase absentes).
> Les affirmations ci-dessous decrivent ce que le code fait; "non teste" signifie qu'aucun parcours reel n'a ete execute.

## 1. Vue d'ensemble

Plateforme sociale academique pour etudiants senegalais: espaces par universite et filiere, canaux de discussion,
partage de documents, opportunites (stages, emplois, bourses), entreprises partenaires, moderation.

**Principes**
- PostgreSQL est la seule source de verite; Redis (Upstash) est optionnel et ne sert qu'au rate limiting.
- Firebase gere uniquement l'authentification (OTP telephone); l'utilisateur est cree en base a la premiere connexion.
- La **carte etudiante est le moyen d'authentifier un etudiant**: un numero de carte = un compte, valide par un admin.
- Moderation separee du choix de l'auteur (champ `estMasque` distinct de `estPublic` / `estActive`).

## 2. Stack

| Technologie | Role |
|---|---|
| NestJS 11, TypeScript | Framework |
| PostgreSQL 17 + Prisma 6.16 | Base de donnees et migrations (6 dossiers de migration) |
| Firebase Admin | Verification des tokens, notifications push (FCM) |
| Socket.IO | Chat temps reel (namespace /chat) |
| Upstash Redis (optionnel) | Rate limiting sur login et upload; sans Redis, l'app fonctionne (fail open) |
| Elasticsearch (optionnel, inactif) | Prevu pour la recherche; non utilise, la recherche passe par Prisma |
| Sentry (optionnel) | Erreurs 5xx |
| DOMPurify | Nettoyage HTML des messages |

Retire: Bull (aucun Redis TCP), reset de mot de passe, bcrypt/bcryptjs cote auth.

## 3. Authentification et roles

Flux: le mobile verifie l'OTP avec Firebase, envoie l'`idToken` a `POST /auth/login`; le backend cree ou retrouve l'utilisateur.
Les routes protegees exigent `Authorization: Bearer <idToken>`. Un utilisateur banni est refuse.

| Role | Pouvoirs |
|---|---|
| student | Lecture, participation (apres verification si RG-02 active) |
| company | Representant d'entreprise validee: publie des opportunites rattachees a son entreprise |
| delegate | Moderation limitee aux canaux ou il est admin/moderateur; cree des canaux dans ses espaces |
| content_admin | Gere les categories de documents et la moderation des opportunites |
| admin | Verifications, entreprises, espaces, signalements, bannissement (pas sur un rang egal ou superieur) |
| superadmin | Tout, dont l'attribution des roles |

**RG-02**: un compte non verifie est en lecture seule (message, vote, document, opportunite, candidature, WebSocket).
Code present mais desactive: `ENFORCE_VERIFICATION=false` par defaut. A activer apres creation du superadmin.

## 4. Verification de la carte etudiante

1. `POST /uploads/carte` (multipart, champ `file`, 5 Mo, JPEG/PNG/WebP controle sur le contenu): renvoie une reference privee.
2. `POST /users/me/verification` avec `photoCarteUrl` (cette reference) et `numeroCarte`.
3. Le numero est normalise; il doit etre libre (un compte unique par carte). Si une liste officielle de l'universite est importee,
   l'admin voit un indicateur "correspondance liste" (numero + nom + prenom). L'etudiant ne le voit jamais.
4. Un admin consulte la photo (`GET /uploads/admin/verification/:id`, tracee dans audit_logs), puis approuve ou rejette.
5. A la decision, la photo est supprimee du disque; le numero de carte est inscrit sur le compte a l'approbation.

Import de la liste: `POST /admin/liste-etudiants/:universiteId` (JSON `{ rows: [{ numeroCarte, nom, prenom, filiere?, niveau? }] }`, 5000 lignes max).

## 5. Endpoints (prefixe /api/v1)

| Module | Routes principales |
|---|---|
| Auth | POST /auth/login |
| Users | GET /users/universites, /users/universites/:id/filieres, /users/:id/public, /users/me; POST/PATCH /users/me/profile; POST/GET /users/me/verification; admin: GET /users/admin/verifications, PATCH .../verifications/:id/approve\|reject, PATCH /users/admin/:id/ban\|unban\|role |
| Espaces | GET /espaces, /espaces/:id, /espaces/me/list; POST :id/join\|leave; admin: POST, PATCH, DELETE, GET :id/membres |
| Canaux | GET /canaux/espace/:id, /canaux/:id, :id/membres; POST :id/join\|leave; POST /canaux; PATCH :id; DELETE :id; PATCH :id/membres/:userId/role |
| Messages | GET /messages/canal/:id, /messages/:id, :id/reponses, canal/:id/search; POST; PATCH; DELETE; POST :id/vote; POST :id/epingle; GET/POST :id/reactions |
| Documents | GET /documents/canal/:id (filtre categoryId), user/me, search/global, :id; POST; PATCH; DELETE; POST :id/hide\|unhide |
| Categories | GET /document-categories; admin/content_admin: POST, PATCH, sous-categories |
| Opportunites | GET /opportunites, :id, search/global, me/list; POST; PATCH; DELETE; admin/content_admin: POST :id/approve\|reject\|expire |
| Candidatures | POST/GET /opportunites/:id/candidatures; GET /candidatures/me; PATCH /candidatures/:id/statut; DELETE /candidatures/:id |
| Favoris | GET /favoris; POST /favoris; DELETE /favoris/:type/:ressourceId |
| Entreprises | GET /entreprises, :id, me; POST; PATCH me; admin: GET admin/list, PATCH admin/:id/approve\|reject\|suspend |
| Notifications | GET /notifications, unread-count; POST :id/read, read-all; DELETE :id, DELETE; POST/DELETE device-token |
| Signalements | POST; GET me; admin/delegue: GET, GET :id, PATCH :id; admin: GET stats |
| Liste etudiants | admin: POST /admin/liste-etudiants/:universiteId, GET .../count |
| Uploads | POST /uploads/carte; admin: GET /uploads/admin/verification/:id |
| Sante | GET /health (503 si la base est indisponible) |

Documentation interactive: `/api/docs` (Swagger, partielle: un seul controleur annote).

**WebSocket** (`/chat`, token dans `auth.token`): `join-canal`, `leave-canal`, `send-message`, `typing`, `mark-read`;
evenements recus: `joined`, `left`, `new-message`, `user-joined`, `user-typing`, `messages-read`, `error`.
Authentification a la connexion, acces au canal verifie, 20 messages / 10 s.

## 6. Regles metier importantes

- **Canaux prives**: lisibles par leurs membres et les admins; messages, documents, favoris et reactions suivent la meme regle.
- **Anonymat**: l'auteur d'un message anonyme n'est visible que de lui-meme et des admins.
- **Votes**: un vote par utilisateur et par message; un second vote identique l'annule; la reputation de l'auteur suit.
- **Documents**: public, ou restreint par niveau et/ou filiere (visible seulement des profils correspondants; exclu de la recherche globale).
  Masquage par un moderateur du canal (`estMasque`); l'auteur peut rendre son document prive (`estPublic`).
- **Opportunites**: publiees directement, moderees ensuite (rejet = masquage). Rattachees automatiquement a l'entreprise active du representant.
- **Entreprises**: demande, validation admin (donne le role company), rejet avec motif, suspension.
- **Notifications**: creees en base puis push FCM sans bloquer; les appareils refuses par FCM sont desactives.

## 7. Securite

- Helmet, CORS limite a `FRONTEND_URL`, validation stricte (whitelist), filtre d'exceptions global (erreurs Prisma traduites).
- Rate limit global 100 req/min (memoire, HTTP) + limites Redis sur login (5/min) et upload (10/min), sans Redis elles ne s'appliquent pas.
- Hierarchie de moderation: ni sur soi-meme, ni sur un rang egal ou superieur.
- Photos de cartes: stockage prive, jamais servi en statique, consultation tracee, supprimees apres decision.
- `TRUST_PROXY` a definir derriere un reverse proxy, sinon toutes les requetes partagent l'IP du proxy.
- Tracabilite: audit_logs (verifications, bans, roles, entreprises, imports, consultation de cartes).

## 8. Base de donnees

Principales tables: utilisateurs, profils, universites, filieres, espaces, espace_membres, canaux, canal_membres (role),
messages, votes_message, message_reactions, documents, document_categories, document_subcategories, opportunites,
opportunite_tags, candidatures, entreprises, favoris, verifications, liste_etudiants, signalements, notifications,
tokens_appareil, audit_logs, tentatives_connexion, ips_bloques.

Tables presentes mais inutilisees: jobs, actions_moderation, articles_marche, tokens_reset_password.
Colonnes de l'ancienne base volontairement absentes: password_hash, must_change_password (auth par mot de passe non reprise).

Deux bases locales existent: `Kamplink_lot3` (utilisee par ce code) et `Kamplink` (ancienne version plus avancee, a conserver).

## 9. Configuration (.env)

Obligatoires: `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FRONTEND_URL`.
Optionnelles: `UPSTASH_REDIS_REST_URL/TOKEN`, `SENTRY_DSN`, `ELASTICSEARCH_URL`, `TRUST_PROXY`, `ENFORCE_VERIFICATION`,
`UPLOAD_DIR`, `SEED_ADMIN_FIREBASE_UID`, `SEED_ADMIN_PHONE`.
En production sans configuration Firebase valide, l'application refuse de demarrer; en developpement elle demarre sans (routes protegees en 401).

## 10. Limites connues

- Aucun test automatise utile (un seul test modele); aucun parcours reel execute.
- Les documents de cours restent des URL libres (pas d'upload hors cartes).
- Stockage local: ne survit pas aux hebergeurs a disque ephemere.
- Lecture sans connexion encore possible pour /opportunites et /espaces.
- Elasticsearch et emails: non utilises.

## 11. Autres documents

`SUIVI.md` (historique et reste a faire), `ETAPES.md` (mise en route et feuille de route), `API_README.md`, `REDIS_ARCHITECTURE.md`,
`UPSTASH_INTEGRATION_GUIDE.md`, `SECURITY_IMPLEMENTATION.md`, `VALIDATION.md`, `AMELIORATIONS_IMPLEMENTEES.md`, `ANALYSE_BACKEND.md`.
**Attention**: ces six derniers datent d'avant les lots 1 a 4c; ils decrivent notamment un reset de mot de passe, Bull et Elasticsearch qui n'existent plus ou ne servent pas. Ils sont a realigner ou archiver.