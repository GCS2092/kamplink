# SUIVI - Backend Kamplink

Derniere mise a jour: 10 novembre 2026
Legende: [x] fait | [~] code mais non teste de bout en bout | [ ] a faire | [?] decision a prendre

> Important: **aucun parcours reel n'a ete execute**. Les cles Firebase manquent, donc toutes les routes
> protegees repondent 401 en local. Ce qui est "fait" ci-dessous a ete ecrit, relu et compile
> (typecheck + build OK), pas valide en conditions reelles.

## Historique des commits

| Commit | Contenu |
|---|---|
| b362705 | Lots 1 a 3: correctifs securite, moderation, votes, push |
| 67677f6 | Nettoyage: retrait de Bull et du code mort |
| d68d903 | Lot 4a: favoris, reactions, candidatures, categories, roles |
| 93be643 | Lot 4b: carte unique, liste officielle, RG-02, entreprises, roles de canal |
| 56d0e32 | Lot 4c: upload prive des photos de cartes |
| 91ac0f8 | Lot 4c: categories/acces par niveau-filiere, entreprise sur opportunites, signalements du delegue |

## Lot 1 - correctifs sans migration [~]
- [x] Rate limit global actif (HttpThrottlerGuard, HTTP seulement) + ConfigModule.forRoot
- [x] CORS: port du front 3001 par defaut (main.ts, chat.gateway.ts)
- [x] Champs inexistants retires (espace.description, signalement.resolutionNotes)
- [x] Messages supprimes (deletedAt) masques partout; signalement sans cible -> 400
- [x] POST /auth/login valide son body (LoginDto)
- [x] Seed deplace dans prisma/seed.ts, rejouable (upsert), superadmin via SEED_ADMIN_FIREBASE_UID

## Lot 2 - controle d'acces et robustesse [~]
- [x] Lecture des canaux, messages, documents: connexion obligatoire + controle des canaux prives (CanalAccessService)
- [x] Canaux prives non listes aux non-membres; espaces prives: adhesion refusee (sauf admin)
- [x] Messages: sanitises cote REST, anonymat reel (auteur masque), pagination bornee (max 100)
- [x] WebSocket: authentification a la connexion, acces canal verifie, room obligatoire, validation, 20 messages / 10 s
- [x] Filtre d'exceptions: erreurs Prisma -> 404/409/400, format documente, envoi a Sentry (5xx)
- [x] /health -> 503 si la base est indisponible
- [x] trust proxy (variable TRUST_PROXY); le throttler n'utilise plus X-Forwarded-For brut
- [x] Roles: PATCH /users/admin/:id/role (superadmin); ban/unban: pas sur soi, pas sur un rang egal ou superieur
- [x] Reset password et POST /auth/profile supprimes (connexion par OTP Firebase)

## Lot 3 - migration (votes, moderation, index, push) [~]
- [x] Table votes_message: 1 vote par utilisateur et par message, re-vote identique = annulation, reputation recalculee
- [x] Champ est_masque (documents, opportunites): moderation separee du choix de l'auteur
- [x] Index sur messages, documents, notifications, signalements, opportunites
- [x] Push: POST/DELETE /notifications/device-token; tokens refuses par FCM desactives
- [x] Notifications creees: verification approuvee/rejetee, reponse a un message, opportunite approuvee/rejetee, document masque, candidature, entreprise
- [x] Transactions: createDocument, approveVerification, rejectVerification
- [x] .env ajoute au .gitignore

## Nettoyage [x]
- [x] Queue Bull retiree (elle exigeait un Redis TCP inexistant; rien ne l'utilisait)
- [x] Code mort retire: SecurityRedisService, CacheService, RedisHealthIndicator, WsJwtGuard
- [x] Dependances inutilisees desinstallees (voir package.json)
- [ ] Supprimer src/messages/messages.service.ts.cassé.bak s'il existe encore
- [ ] Supprimer AppController / AppService (modele NestJS) et leur test

## Lot 4a - schema aligne sur l'ancienne base [~]
- [x] Favoris (opportunite, message, document), reactions emoji, candidatures (CV, lettre), categories et sous-categories de documents
- [x] Roles company et content_admin; cv_url sur le profil; role dans un canal (admin, moderateur, membre, invite)
- [x] Tables et colonnes avec les memes noms que l'ancienne base (copie de donnees possible plus tard)

## Lot 4b - carte etudiante, entreprises, delegue [~]
- [x] Carte etudiante: numero saisi avec la photo, unique (une carte = un compte), inscrit sur le compte a l'approbation
- [x] Liste officielle: POST /admin/liste-etudiants/:universiteId (JSON, 5000 lignes max); l'admin voit "correspondance liste", rien n'est valide automatiquement, l'etudiant ne voit pas ce resultat
- [x] RG-02: VerifiedGuard (message, vote, document, opportunite, candidature, WebSocket); interrupteur ENFORCE_VERIFICATION (false par defaut)
- [x] Entreprises: demande, validation admin (donne le role company), rejet avec motif, suspension, liste publique des actives
- [x] Delegue: moderation limitee aux canaux ou il est admin/moderateur; creation de canal dans un espace dont il est membre; espaces reserves aux admins

## Lot 4c - uploads, documents, opportunites, signalements [~]
- [x] POST /uploads/carte (5 Mo, JPEG/PNG/WebP verifie sur le contenu), stockage prive hors URL publique
- [x] photoCarteUrl = reference d'upload appartenant a l'utilisateur (plus d'URL libre)
- [x] GET /uploads/admin/verification/:id (admin), consultation tracee dans audit_logs; photo supprimee a la decision
- [x] Documents: categorie/sous-categorie validees, filtre categoryId, acces restreint par niveau et/ou filiere
- [x] Opportunites rattachees automatiquement a l'entreprise active du representant
- [x] Signalements: un delegue ne voit et ne traite que ceux de ses canaux (messages et documents)

## Reste a faire (par priorite)
1. [ ] **Cles Firebase** puis parcours complet (connexion, profil, carte, approbation, message, document restreint, entreprise)
2. [ ] Creer le superadmin (SEED_ADMIN_FIREBASE_UID + npm run seed), puis ENFORCE_VERIFICATION=true
3. [ ] Tests: realigner test/auth.e2e-spec.ts et test/security.e2e-spec.ts (non lus, ciblent sans doute des endpoints supprimes); tests unitaires sur acces aux canaux, hierarchie des roles, unicite de la carte, votes
4. [ ] Documents Word/PDF reels: aujourd'hui urlFichier est une URL libre (seules les cartes ont un upload)
5. [ ] Hebergement: disque persistant ou stockage objet prive pour storage/; TRUST_PROXY derriere un proxy
6. [ ] Lecture publique encore sans connexion: GET /opportunites, /opportunites/:id, /espaces, /espaces/:id
7. [ ] Signalements sur opportunites ou utilisateurs: visibles des admins seulement
8. [ ] Swagger: un seul controleur annote
9. [ ] Elasticsearch inactif (la recherche passe par Prisma): le supprimer ou l'alimenter
10. [ ] Email: aucun service d'envoi (plus de queue); pas necessaire tant que l'auth est par OTP

## Decisions prises (modifiables) [?]
- [?] Pas de reset password: authentification par OTP Firebase uniquement
- [?] Canaux, messages, documents: connexion obligatoire; universites, filieres et espaces publics restent consultables pour l'inscription
- [?] Carte etudiante: validation manuelle par un admin, la liste officielle n'est qu'une aide
- [?] RG-02 desactive tant qu'aucun superadmin n'existe
- [?] Delegue: limite aux canaux ou il a un role admin/moderateur
- [?] Connexion des entreprises: aujourd'hui par OTP comme tout le monde. L'ancienne base avait password_hash, numero_carte et must_change_password: **comment une entreprise doit-elle se connecter ? (non decide)**
- [?] Nom du projet: Kamplink ou CampusLink (les deux coexistent dans le code et les docs)

## Points de vigilance
- Ancienne base `Kamplink` (version plus avancee, sans le code): **ne pas supprimer**; sauvegarde sur le Bureau (Kamplink_ancienne_base_*.sql); le code actuel utilise la base `Kamplink_lot3`
- Votes: les anciens votes_positifs ne correspondent a aucune ligne de votes_message
- Blocage de connexion par IP: sur reseau mobile (CGNAT), plusieurs etudiants peuvent partager une IP
- Mot de passe PostgreSQL ecrit dans la conversation et present dans .env: le changer avant tout deploiement