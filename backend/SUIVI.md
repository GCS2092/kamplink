# SUIVI - Kamplink backend

Legende: [x] fait | [ ] a faire | [?] decision a confirmer

## Lot 1 (fait, verifie: typecheck + build + tests)
- [x] Rate limit global actif (HttpThrottlerGuard), ConfigModule.forRoot, CORS port 3001
- [x] Champs inexistants retires (espace.description, signalement.resolutionNotes)
- [x] Messages supprimes masques, signalement sans cible -> 400, LoginDto
- [x] L'auteur ne peut plus demasquer message / document / opportunite moderes
- [x] Seed: prisma/seed.ts, rejouable, superadmin via SEED_ADMIN_FIREBASE_UID

## Lot 2 (applique, a verifier par typecheck + build)
- [x] Lecture des canaux, messages, documents: connexion obligatoire + controle canal prive (CanalAccessService)
- [x] Canaux prives non listes aux non-membres; espaces prives: adhesion refusee (sauf admin)
- [x] Documents masques invisibles (liste, detail, recherche); recherche exclut les canaux prives
- [x] Messages: sanitises cote REST, anonymat reel (auteur masque), suppression par moderateur, pagination bornee (max 100)
- [x] Reputation: updateMany (plus de 500 si pas de profil); vote bas ne passe plus sous 0
- [x] WebSocket: auth a la connexion, acces canal verifie, room obligatoire, validation, limite 20 msg/10 s
- [x] Filtre d'exceptions: erreurs Prisma -> 404/409/400, format de la doc, envoi a Sentry (5xx)
- [x] /health -> 503 si base down
- [x] trust proxy (variable TRUST_PROXY) + throttler Redis n'utilise plus X-Forwarded-For brut
- [x] Roles: PATCH /users/admin/:id/role (superadmin); ban/unban: pas sur soi, pas sur rang egal ou superieur
- [x] Verifications: pas de double decision, pas de 500 sans profil
- [x] Reset password supprime (OTP Firebase); POST /auth/profile supprime (garder /users/me/profile)
- [x] Echecs de login comptes par IP au lieu de 'unknown'

## Lot 3 (applique, a verifier par typecheck + build)
- [x] Table votes_message: 1 vote par utilisateur et par message, re-vote identique = annulation, reputation recalculee
- [x] Champ est_masque (documents, opportunites): moderation separee du choix de l auteur; l auteur peut a nouveau rendre son document prive ou desactiver son opportunite
- [x] Index: messages, documents, notifications, signalements, opportunites
- [x] Appareils push: POST/DELETE /notifications/device-token, tokens refuses par FCM desactives
- [x] Notifications creees: verification approuvee/rejetee, reponse a un message, opportunite approuvee/rejetee, document masque
- [x] Transactions: createDocument, approveVerification, rejectVerification
- [x] Pagination bornee a 100: documents, opportunites, notifications, signalements
## Reste a faire
- [ ] Notifications supplementaires (mentions, signalement traite) si besoin
- [ ] Perimetre du role delegate (aujourd'hui: tous les espaces et canaux)
- [ ] Tests e2e (auth.e2e-spec, security.e2e-spec) a realigner (endpoints reset-password supprimes); les 3 .spec annonces par VALIDATION.md n'existent pas
- [ ] Nettoyage deps: bcrypt, firebase, nestjs-pino, pino, node-cron, zod, platform-fastify
- [ ] Code mort: SecurityRedisService, CacheService, RedisHealthIndicator, AppController/AppService, WsJwtGuard, methodes de reset dans SecurityService, table TokenResetPassword
- [ ] git init + premier commit
- [ ] README.md = template NestJS; fichier "A faire" obsolete

## Decisions prises (modifiables) [?]
- [?] Pas de reset password; /auth/profile supprime
- [?] Canaux/messages/documents: connexion obligatoire; universites, filieres, liste des espaces publics restent publics
- [?] Bull: Redis TCP reel requis (Upstash REST ne convient pas) ou suppression de la queue
- [?] Elasticsearch: indexer vraiment ou supprimer
- [?] RG-02 (non verifie = lecture seule): non applique pour ne pas bloquer tous les comptes avant qu'un admin existe
- [?] Upload fichiers: stockage a choisir (Firebase Storage, Supabase, S3)
- [?] Nom: Kamplink ou CampusLink
- [?] CGNAT: le blocage par IP peut toucher plusieurs etudiants derriere la meme IP mobile

## Documentation a reecrire
- [ ] DOCUMENTATION_COMPLETE.md, SECURITY_IMPLEMENTATION.md, VALIDATION.md, ANALYSE_BACKEND.md, API_README.md: realigner sur le code reel (colonnes fait / partiel / prevu)

## A lire encore
- [ ] .gitignore, test/*, scripts/test-security.sh, migrations SQL, REDIS_ARCHITECTURE.md, UPSTASH_INTEGRATION_GUIDE.md
## Lot 4b (applique)
- [x] Carte etudiante: numero saisi avec la photo, unique (une carte = un compte), inscrit sur le compte a l'approbation
- [x] Liste officielle: POST /admin/liste-etudiants/:universiteId (JSON, 5000 lignes max); l'admin voit "correspondance liste", rien n'est valide automatiquement
- [x] RG-02: garde VerifiedGuard (message, vote, document, opportunite, candidature, WebSocket); interrupteur ENFORCE_VERIFICATION dans .env (false par defaut)
- [x] Entreprises: demande, validation admin (role company), suspension, liste publique des actives
- [x] Delegue: moderation limitee aux canaux ou il est admin/moderateur; roles de canal (PATCH /canaux/:id/membres/:userId/role); espaces reserves aux admins
## Lot 4c (a faire)
- [ ] Documents: categories/sous-categories a la creation, acces restreint par niveau ou filiere
- [ ] Opportunites liees a une entreprise active (entrepriseId automatique)
- [ ] Signalements: portee du delegue
- [ ] Photos de cartes: stockage prive (upload de fichiers)

## Lot 4c - upload prive des cartes (applique)
- [x] POST /uploads/carte (5 Mo, JPEG/PNG/WebP verifie sur le contenu), stockage prive hors URL publique
- [x] photoCarteUrl = reference d'upload appartenant a l'utilisateur (plus d'URL libre)
- [x] GET /uploads/admin/verification/:id (admin), consultation tracee dans audit_logs
- [x] Photo supprimee du disque a l'approbation ou au rejet
- [ ] Stockage objet prive si l'hebergeur n'a pas de disque persistant
- [ ] Reste du lot 4c: categories de documents, acces par niveau/filiere, opportunites liees a une entreprise, signalements du delegue
