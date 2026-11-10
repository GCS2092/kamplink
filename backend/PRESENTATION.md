# Kamplink - Presentation du projet

## En une phrase

Kamplink (nom de code interne: CampusLink) est une plateforme sociale academique pour les etudiants senegalais:
un endroit unique pour discuter par filiere, partager des cours, trouver des stages et des emplois,
avec la garantie que les utilisateurs sont de vrais etudiants.

## Le probleme

Aujourd'hui, les etudiants s'organisent sur des groupes WhatsApp et Facebook:
- les cours, examens et resumes se perdent dans des fils de discussion sans fin;
- les offres de stage, d'emploi et de bourse circulent au hasard, souvent trop tard;
- n'importe qui peut rejoindre un groupe: pas de moyen de savoir si l'interlocuteur est etudiant;
- la moderation depend de la bonne volonte de quelques personnes, sans outils;
- rien n'est organise par universite, filiere et niveau.

## Le but

Donner a chaque etudiant un espace organise a son parcours (universite, filiere, niveau), de confiance,
ou il trouve les ressources et les opportunites utiles a sa reussite et a son insertion professionnelle.

## Le principe central: la carte etudiante

La carte etudiante est le moyen d'authentifier un etudiant. Un numero de carte = un compte.
1. L'etudiant se connecte par code SMS (OTP), puis cree son profil.
2. Il televerse la photo de sa carte (stockage prive) et saisit son numero.
3. Un administrateur verifie, aide par la liste officielle de l'universite si elle a ete importee.
4. A la decision, la photo est supprimee; seul le numero reste, pour empecher qu'une carte serve a plusieurs comptes.

C'est ce qui distingue Kamplink d'un groupe de discussion ouvert: la communaute est fermee et verifiee.

## Pour qui

| Profil | Ce qu'il y gagne |
|---|---|
| Etudiant | Discussions par filiere, cours et examens classes, offres de stage et d'emploi, candidature directe |
| Delegue | Outils pour animer et moderer les canaux de sa classe ou de sa filiere |
| Entreprise | Publier des offres aupres d'etudiants verifies, recevoir des candidatures (apres validation) |
| Administration | Verifier les etudiants et les entreprises, traiter les signalements, suivre un journal d'audit |

## Fonctionnalites

**Communaute**
- Espaces par universite, filiere et niveau; canaux publics ou prives
- Messages avec reponses en fil, messages anonymes, reactions emoji, epinglage, recherche
- Chat en temps reel
- Votes sur les messages et score de reputation (recompense les contributeurs utiles)

**Ressources**
- Partage de documents: cours, examens, resumes, exercices
- Categories et sous-categories
- Acces public ou restreint a certains niveaux ou filieres (un sujet de L2 reste reserve aux L2)
- Favoris pour retrouver ce qui compte

**Emploi et opportunites**
- Stages, emplois, bourses, concours, evenements, avec date limite et filtres
- Candidatures avec CV et lettre de motivation, suivi du statut (envoyee, vue, acceptee, refusee)
- Entreprises validees par un administrateur; leurs offres leur sont rattachees automatiquement

**Confiance et moderation**
- Verification des etudiants par carte, une carte par compte
- Signalements de messages, documents et opportunites
- Roles: etudiant, delegue, entreprise, content admin, admin, superadmin, avec une hierarchie respectee
- Un delegue ne modere que les canaux dont il a la charge
- Journal d'audit des actions sensibles
- Notifications dans l'application et push sur mobile

## Pourquoi c'est un bon projet

**Il repond a un besoin reel et concret.** Les groupes WhatsApp et Facebook sont la pratique actuelle,
et leurs defauts (desordre, pas de verification, pas de moderation) sont vecus par tous les etudiants.

**Il s'appuie sur un atout difficile a copier: la verification par la carte etudiante.**
Une communaute fermee et fiable attire les etudiants, qui y trouvent des pairs authentiques,
et les entreprises, qui y trouvent un public qualifie.

**Il a un modele a deux faces.** Les etudiants apportent l'audience, les entreprises apportent les opportunites,
et chaque cote rend l'autre plus utile.

**Il est pense pour le contexte local.** Connexion par telephone (le mobile est le premier ecran),
universites et filieres senegalaises, structure adaptable a d'autres pays.

**Il protege les donnees sensibles.** La photo de la carte est stockee en prive, consultable seulement par les admins
avec trace, et supprimee apres decision. Les canaux prives, l'anonymat des messages et les documents restreints
sont controles cote serveur.

**Son socle technique est solide et evolutif.**
- NestJS et TypeScript: architecture modulaire, un module par domaine
- PostgreSQL avec Prisma: schema versionne par migrations
- Firebase pour l'authentification et les notifications push
- Socket.IO pour le temps reel
- Redis et Sentry en options, sans lesquels l'application fonctionne

**Il peut grandir.** Une fois une universite lancee, les memes mecanismes servent d'autres universites,
et le catalogue (documents, offres, entreprises) prend de la valeur avec l'usage.

## Etat actuel, sans enjolivement

- Le code des fonctionnalites ci-dessus est ecrit et compile (typecheck et build OK).
- **Il n'a jamais ete execute de bout en bout**: les cles Firebase n'ont pas encore ete renseignees,
  donc aucun parcours reel (connexion, carte, message, document) n'a ete valide. C'est la prochaine etape.
- Il n'y a pas encore de tests automatises significatifs.
- Les documents de cours sont de simples liens: seul le televersement des cartes existe.
- Le stockage des photos est local; il faudra un stockage persistant en hebergement.
- Decision en attente: la connexion des entreprises (code SMS comme les etudiants, ou email et mot de passe).
- Il n'y a pas d'application mobile ni de site dans ce depot: c'est uniquement le backend (l'API).

Un bon projet n'est pas un projet fini: c'est un projet dont l'idee tient, dont la base est saine,
et dont on sait exactement ce qu'il reste a faire. Voir ETAPES.md et SUIVI.md.

## Pour aller plus loin

- README.md: demarrage et configuration
- explication/DOCUMENTATION_COMPLETE.md: architecture, roles, endpoints, regles metier
- SUIVI.md: historique des lots et reste a faire
- ETAPES.md: mise en route et parcours de test