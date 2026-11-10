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

## Lot 3 (necessite une migration Prisma)
- [ ] Table de votes (1 vote / utilisateur / message)
- [ ] Champ de moderation dedie sur documents et opportunites (estMasque) + auteur peut rendre son document prive
- [ ] Index: messages(canalId, createdAt), documents(canalId), notifications(utilisateurId, estLue), signalements(statut)
- [ ] Table/endpoint token appareil (push) + creation de notifications sur evenements

## Reste a faire
- [ ] Pagination bornee + ParseUUIDPipe dans documents, opportunites, notifications, signalements
- [ ] Transactions createDocument / approveVerification
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