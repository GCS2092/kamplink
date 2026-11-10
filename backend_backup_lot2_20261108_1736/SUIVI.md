# SUIVI - Kamplink backend

Legende: [x] fait | [ ] a faire | [?] decision requise

## Lot 1 - applique (a confirmer par `npm run typecheck`)
- [x] Rate limit global actif (HttpThrottlerGuard, HTTP seulement) + ConfigModule.forRoot
- [x] CORS: port front 3001 par defaut (main.ts, chat.gateway.ts)
- [x] Champs inexistants retires (espace.description, signalement.resolutionNotes)
- [x] Signalement sans cible -> 400
- [x] Messages supprimes (deletedAt) masques partout
- [x] Auteur ne peut plus demasquer un message / reactiver un doc masque / reactiver une opportunite rejetee
- [x] Documents masques invisibles (liste canal + detail)
- [x] POST /auth/login valide son body (LoginDto)
- [x] Seed: bon dossier (prisma/seed.ts), rejouable (upsert), superadmin via SEED_ADMIN_FIREBASE_UID

## Critique - lot 2 (apres tes decisions)
- [ ] Lecture REST des messages/documents/canaux: authentification + controle canal prive
- [ ] WebSocket: verifier acces canal dans send-message, authentifier des handleConnection, ne pas relire Firebase a chaque evenement
- [ ] Espaces prives: joinEspace doit respecter estPublic, ne pas lister les canaux prives
- [ ] Votes: table de votes (1 vote / utilisateur / message), plus de votesPositifs negatif
- [ ] Anonymat: masquer l'auteur quand estAnonyme
- [ ] Rate limit: trust proxy + ne plus faire confiance a X-Forwarded-For brut
- [ ] Endpoint pour attribuer un role (sinon seul le seed cree un admin)

## Important
- [ ] Filtre d'exceptions: mapper les erreurs Prisma (P2002->409, P2025->404, P2003->400)
- [ ] Transactions: createDocument, approveVerification, rejectVerification
- [ ] /health: repondre 503 quand la base est down
- [ ] Appliquer RG-02 (non verifie = lecture seule)
- [ ] Bloquer l'ordre des roles: un admin ne peut pas bannir un admin/superadmin
- [ ] Sanitiser les messages REST (seul le WebSocket le fait)
- [ ] Borner page/limit (max 100), ParseUUIDPipe sur les :id
- [ ] POST /auth/profile: DTO (doublon de /users/me/profile)
- [ ] Index Prisma: messages(canalId,createdAt), documents, notifications, signalements
- [ ] Logs d'echec de login: identifiant reel au lieu de 'unknown'

## Decisions a prendre [?]
- [?] Reset password: supprimer forgot/reset-password (auth = OTP Firebase, pas de mot de passe) ?
- [?] Doublon /auth/profile vs /users/me/profile: garder lequel ?
- [?] Lecture des canaux/messages: connexion obligatoire pour tout ?
- [?] Moderation documents/opportunites: ajouter un champ estMasque dedie (migration) ?
- [?] Bull: vrai Redis TCP (Upstash rediss://) ou supprimer la queue ?
- [?] Elasticsearch: indexer vraiment ou supprimer ?
- [?] Notifications: quels evenements en creent (reponse, mention, validation verif...) + endpoint token appareil
- [?] Upload fichiers: stockage (Firebase Storage, Supabase, S3) ?
- [?] Perimetre du role delegate (tous les espaces ou le sien seulement) ?
- [?] Nom du projet: Kamplink ou CampusLink ?

## Nettoyage
- [ ] Supprimer deps inutilisees: bcrypt, firebase, nestjs-pino, pino, node-cron, zod, platform-fastify
- [ ] Code mort: SecurityRedisService, CacheService, RedisHealthIndicator, AppController/AppService
- [ ] README.md = template NestJS; fichier "A faire" = copie d'un chat obsolete
- [ ] Tests: les 3 .spec annonces par VALIDATION.md n'existent pas
- [ ] git init + premier commit

## Documentation a reecrire
- [ ] DOCUMENTATION_COMPLETE.md: format d'erreur, limites de debit, creation de profil, "upload", Redis/Bull/Elasticsearch (voir ecarts releves)
- [ ] SECURITY_IMPLEMENTATION.md / VALIDATION.md / ANALYSE_BACKEND.md: statuts a realigner sur le code
- [ ] API_README.md: ajouter /auth/forgot-password et /auth/reset-password (ou les retirer du code)

## A lire encore
- [ ] .gitignore, test/*, scripts/test-security.sh, migrations SQL, REDIS_ARCHITECTURE.md, UPSTASH_INTEGRATION_GUIDE.md, fin de SECURITY_IMPLEMENTATION.md et AMELIORATIONS_IMPLEMENTEES.md