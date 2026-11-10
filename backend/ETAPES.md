# ETAPES - de la mise en route au deploiement

Derniere mise a jour: 10 novembre 2026

## A. Mise en route locale (faite sauf Firebase)

| # | Etape | Etat |
|---|---|---|
| 1 | Installer les dependances (`npm install --legacy-peer-deps`) | Fait |
| 2 | Generer le client Prisma (`npx prisma generate`) | Fait |
| 3 | PostgreSQL local, base `Kamplink_lot3`, `DATABASE_URL` dans .env | Fait |
| 4 | Appliquer les migrations (`npm run prisma:migrate:deploy`) | Fait (5 migrations) |
| 5 | Seed universites et filieres (`npm run seed`) | Fait |
| 6 | Demarrer (`npm run start:dev`), tester /api/v1/health et /api/docs | Fait avant les lots 4 |
| 7 | **Renseigner les cles Firebase dans .env** | **A faire (bloquant)** |
| 8 | Creer le superadmin (SEED_ADMIN_FIREBASE_UID puis `npm run seed`) | A faire |
| 9 | Activer `ENFORCE_VERIFICATION=true` | A faire apres 8 |

Rappels: arreter `start:dev` avant toute migration ou `prisma generate` (Windows); verifier que le disque D: est branche; utiliser les scripts npm plutot que `npx prisma` seul.

## B. Etapes de developpement realisees

1. Lecture du code et audit (60 % fonctionnel, securite en partie decorative)
2. Lot 1: correctifs sans migration
3. Lot 2: controle d'acces, WebSocket, filtre d'erreurs, roles
4. Lot 3: votes, moderation separee, index, push, notifications
5. Nettoyage: Bull et code mort retires; git initialise; premier commit
6. Lot 4a: favoris, reactions, candidatures, categories
7. Lot 4b: carte unique, liste officielle, RG-02, entreprises, delegue par canal
8. Lot 4c: upload prive des cartes, categories/acces par niveau-filiere, entreprise sur opportunites, signalements du delegue
9. Documentation mise a jour (ce fichier, SUIVI.md, DOCUMENTATION_COMPLETE.md)

## C. Parcours de test a executer des que Firebase est configure

1. Connexion: POST /auth/login avec un idToken -> utilisateur cree
2. Profil: POST /users/me/profile (universite + filiere + niveau)
3. Carte: POST /uploads/carte, puis POST /users/me/verification (photoCarteUrl + numeroCarte)
4. Admin: liste des verifications, consultation de la photo, approbation -> profil "verified", photo supprimee
5. Meme numero de carte avec un 2e compte -> refuse (409)
6. Espace: rejoindre un espace public; un espace prive -> refuse
7. Canal prive: un non-membre ne lit pas les messages (403); un membre oui
8. Message, reponse (notification a l'auteur), reaction, vote (second vote identique = annulation)
9. Message anonyme: l'auteur est masque pour un autre etudiant, visible pour un admin
10. Document restreint (niveau L2): visible d'un L2, invisible d'un L3; absent de la recherche globale
11. Entreprise: demande -> approbation admin -> role company -> opportunite rattachee automatiquement
12. Candidature: depot, acceptation (notification), retrait
13. Delegue: modere son canal, refuse sur un autre canal
14. WebSocket: connexion sans token refusee; send-message sans join-canal refuse; message recu par les autres membres
15. Activer ENFORCE_VERIFICATION=true: un compte non verifie ne peut plus poster

## D. Etapes restantes

| Priorite | Etape |
|---|---|
| 1 | Cles Firebase + parcours C ci-dessus (corriger les bugs d'integration trouves) |
| 2 | Tests automatises: realigner les e2e, tests unitaires des regles critiques |
| 3 | Decider la connexion des entreprises (OTP seul ou email + mot de passe) |
| 4 | Upload des documents de cours (stockage prive ou objet) |
| 5 | Fermer la lecture publique de /opportunites et /espaces si souhaite |
| 6 | Realigner ou archiver les anciens documents (voir DOCUMENTATION_COMPLETE.md, section 11) |
| 7 | Elasticsearch: supprimer ou alimenter; Swagger: annoter les controleurs |
| 8 | Hebergement: base geree, disque persistant ou stockage objet, TRUST_PROXY, variables d'environnement, NODE_ENV=production |
| 9 | Securite avant mise en ligne: changer le mot de passe PostgreSQL, ne jamais committer .env, sauvegardes de la base |
| 10 | Decider du sort de l'ancienne base `Kamplink` (migrer entreprises, candidatures, favoris reels) puis l'archiver |

## E. Commandes utiles

- Verifier: `npm run typecheck`, `npm run build`, `npm test`
- Migrations: `npm run prisma:migrate:deploy` (appliquer), `npx --no-install prisma migrate status` (etat)
- Historique: `git log --oneline`, retour arriere d'un lot: `git revert <commit>` (la base ne revient pas, voir SUIVI.md)