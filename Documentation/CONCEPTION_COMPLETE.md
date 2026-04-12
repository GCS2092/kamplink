# kamplink — Conception Complète (Documentation Textuelle)

> Plateforme numérique pour étudiants africains francophones  
> Stack : NestJS + PostgreSQL + Firebase Auth + Render  
> Version : Phase 1 & 2

---

## 1. DIAGRAMME DE CAS D'UTILISATION

### 1.1 Acteurs

| Acteur | Description |
|--------|-------------|
| **Étudiant** | Utilisateur principal — inscrit, vérifié, actif |
| **Délégué** | Étudiant avec droits élargis sur son espace filière |
| **Entreprise / Recruteur** | Publie des opportunités (stage, emploi, bourse) |
| **Administrateur** | Gère la plateforme, modère, valide les vérifications |

---

### 1.2 Cas d'utilisation par acteur

#### Étudiant
```
UC-01 : S'inscrire sur la plateforme
UC-02 : Se connecter (OTP / Firebase Auth)
UC-03 : Soumettre sa carte étudiante pour vérification
UC-04 : Rejoindre un espace (université / filière / niveau)
UC-05 : Consulter le fil d'actualité personnalisé
UC-06 : Lire et télécharger un document de cours
UC-07 : Partager un document dans un espace
UC-08 : Publier un message / question dans un canal
UC-09 : Répondre à un message (vote positif inclus)
UC-10 : Consulter les opportunités filtrées
UC-11 : Signaler un contenu inapproprié
UC-12 : Modifier son profil académique
UC-13 : Accéder au marketplace (phase 2)
```

#### Délégué (hérite de tous les cas Étudiant +)
```
UC-14 : Épingler une annonce dans l'espace filière
UC-15 : Modérer les messages de son espace
UC-16 : Partager des documents officiels de la filière
UC-17 : Gérer les membres de l'espace filière
```

#### Entreprise / Recruteur
```
UC-18 : Créer un compte entreprise
UC-19 : Publier une opportunité (stage / emploi / bourse / concours)
UC-20 : Cibler par niveau et filière
UC-21 : Consulter les statistiques de ses publications
UC-22 : Archiver / supprimer une opportunité expirée
```

#### Administrateur
```
UC-23 : Valider ou rejeter une demande de vérification étudiant
UC-24 : Suspendre / bannir un compte
UC-25 : Supprimer un contenu signalé
UC-26 : Gérer les universités et filières référencées
UC-27 : Consulter les tableaux de bord (stats globales)
UC-28 : Gérer les rôles (promouvoir délégué)
UC-29 : Consulter les logs d'audit
```

---

### 1.3 Relations entre cas d'utilisation

```
UC-01 <<include>> UC-02          (inscription inclut connexion)
UC-03 <<include>> UC-01          (vérification nécessite inscription)
UC-04 <<extend>>  UC-01          (rejoindre espace étend inscription)
UC-07 <<include>> UC-04          (partager doc nécessite être dans un espace)
UC-08 <<include>> UC-04          (publier message nécessite être dans un espace)
UC-09 <<extend>>  UC-08          (répondre étend publier un message)
UC-14 <<extend>>  UC-08          (épingler étend publier — délégué uniquement)
UC-23 <<include>> UC-03          (valider vérif nécessite une soumission)
```

---

## 2. DIAGRAMME DE CLASSES

### 2.1 Classe : Utilisateur

```
+----------------------------------+
|           UTILISATEUR            |
+----------------------------------+
| # id_utilisateur : UUID          |
| telephone : String               |
| nom_complet : String             |
| email : String [0..1]            |
| firebase_uid : String            |
| role : Enum {student, delegate,  |
|              admin, superadmin}  |
| est_actif : Boolean              |
| est_banni : Boolean              |
| created_at : DateTime            |
| updated_at : DateTime            |
| deleted_at : DateTime [0..1]     |
+----------------------------------+
| + s_inscrire() : void            |
| + se_connecter() : Token         |
| + modifier_profil() : void       |
| + rejoindre_espace() : void      |
+----------------------------------+
```

### 2.2 Classe : Profil

```
+----------------------------------+
|             PROFIL               |
+----------------------------------+
| # id_profil : UUID               |
| FK id_utilisateur : UUID         |
| FK id_universite : UUID          |
| FK id_filiere : UUID             |
| niveau : Enum {L1,L2,L3,M1,M2}  |
| photo_carte_url : String [0..1]  |
| statut_verification : Enum       |
|   {pending, verified, rejected}  |
| score_reputation : Integer       |
| verifie_le : DateTime [0..1]     |
| created_at : DateTime            |
| updated_at : DateTime            |
+----------------------------------+
```

### 2.3 Classe : Université

```
+----------------------------------+
|           UNIVERSITE             |
+----------------------------------+
| # id_universite : UUID           |
| nom : String                     |
| ville : String                   |
| pays : String                    |
| logo_url : String [0..1]         |
| est_actif : Boolean              |
+----------------------------------+
```

### 2.4 Classe : Filière (Département)

```
+----------------------------------+
|            FILIERE               |
+----------------------------------+
| # id_filiere : UUID              |
| FK id_universite : UUID          |
| nom : String                     |
| code : String [0..1]             |
| est_actif : Boolean              |
+----------------------------------+
```

### 2.5 Classe : Espace

```
+----------------------------------+
|             ESPACE               |
+----------------------------------+
| # id_espace : UUID               |
| FK id_universite : UUID [0..1]   |
| FK id_filiere : UUID [0..1]      |
| nom : String                     |
| type_espace : String             |
| niveau : String [0..1]           |
| est_public : Boolean             |
| est_actif : Boolean              |
| date_creation : DateTime         |
+----------------------------------+
```

### 2.6 Classe : Canal (Channel)

```
+----------------------------------+
|              CANAL               |
+----------------------------------+
| # id_canal : UUID                |
| FK id_espace : UUID              |
| nom : String                     |
| description : String [0..1]      |
| est_public : Boolean             |
| est_actif : Boolean              |
+----------------------------------+
```

### 2.7 Classe : Document

```
+----------------------------------+
|            DOCUMENT              |
+----------------------------------+
| # id_document : UUID             |
| FK id_canal : UUID [0..1]        |
| FK id_utilisateur : UUID         |
| titre : String                   |
| url_fichier : String             |
| matiere : String [0..1]          |
| type_fichier : Enum              |
|   {cours, exam, resume,          |
|    exercice, autre}              |
| mime_type : String               |
| taille_octets : Integer          |
| nb_telechargements : Integer     |
| est_public : Boolean             |
| date_partage : DateTime          |
| deleted_at : DateTime [0..1]     |
+----------------------------------+
```

### 2.8 Classe : Message (Post)

```
+----------------------------------+
|             MESSAGE              |
+----------------------------------+
| # id_message : UUID              |
| FK id_canal : UUID               |
| FK id_auteur : UUID              |
| FK id_parent : UUID [0..1]       |
| contenu : String                 |
| type : Enum {annonce, question,  |
|              ressource, discuss} |
| votes_positifs : Integer         |
| est_reponse : Boolean            |
| est_epingle : Boolean            |
| est_masque : Boolean             |
| date_envoi : DateTime            |
| deleted_at : DateTime [0..1]     |
+----------------------------------+
```

### 2.9 Classe : Opportunité

```
+----------------------------------+
|           OPPORTUNITE            |
+----------------------------------+
| # id_opportunite : UUID          |
| FK id_auteur : UUID              |
| titre : String                   |
| description : String             |
| type_offre : Enum                |
|   {stage, emploi, bourse,        |
|    concours, evenement}          |
| domaine : String [0..1]          |
| niveau_requis : Enum             |
|   {L1,L2,L3,M1,M2,tous}        |
| date_limite : DateTime [0..1]    |
| localisation : String [0..1]     |
| source_url : String [0..1]       |
| est_active : Boolean             |
| est_expiree : Boolean            |
| nb_vues : Integer                |
| date_creation : DateTime         |
| deleted_at : DateTime [0..1]     |
+----------------------------------+
```

### 2.10 Classe : Vérification

```
+----------------------------------+
|          VERIFICATION            |
+----------------------------------+
| # id_verif : UUID                |
| FK id_utilisateur : UUID         |
| photo_carte_url : String         |
| statut : Enum                    |
|   {pending, verified, rejected}  |
| date_soumission : DateTime       |
| date_decision : DateTime [0..1]  |
| FK id_admin : UUID [0..1]        |
| motif_rejet : String [0..1]      |
+----------------------------------+
```

### 2.11 Classe : Signalement (Report)

```
+----------------------------------+
|           SIGNALEMENT            |
+----------------------------------+
| # id_signalement : UUID          |
| FK id_auteur : UUID              |
| FK id_cible_user : UUID [0..1]   |
| FK id_message : UUID [0..1]      |
| FK id_document : UUID [0..1]     |
| FK id_opportunite : UUID [0..1]  |
| raison : Enum                    |
|   {spam, inapproprie,            |
|    harcelement, autre}           |
| details : String [0..1]          |
| statut : Enum                    |
|   {ouvert, en_cours, resolu,     |
|    classe}                       |
| created_at : DateTime            |
+----------------------------------+
```

### 2.12 Classe : Notification

```
+----------------------------------+
|          NOTIFICATION            |
+----------------------------------+
| # id_notification : UUID         |
| FK id_utilisateur : UUID         |
| type : Enum                      |
|   {opportunite, message,         |
|    document, mention, systeme}   |
| titre : String                   |
| corps : String                   |
| donnees : JSON [0..1]            |
| est_lue : Boolean                |
| lue_le : DateTime [0..1]         |
| created_at : DateTime            |
+----------------------------------+
```

### 2.13 Classe : Marketplace (Phase 2)

```
+----------------------------------+
|         ARTICLE_MARCHE           |
+----------------------------------+
| # id_article : UUID              |
| FK id_vendeur : UUID             |
| titre : String                   |
| description : String             |
| prix : Decimal [0..1]            |
| categorie : Enum                 |
|   {service, materiel,            |
|    tutorat, autre}               |
| statut : Enum                    |
|   {actif, vendu, archive}        |
| images_urls : String[]           |
| created_at : DateTime            |
| deleted_at : DateTime [0..1]     |
+----------------------------------+
```

---

### 2.14 Associations et multiplicités

```
UTILISATEUR        ||--o{    PROFIL              (1 utilisateur a 1 profil)
UTILISATEUR        ||--o{    ESPACE_MEMBRE        (1 user peut rejoindre 0..N espaces)
UTILISATEUR        ||--o{    CANAL_MEMBRE         (1 user peut être dans 0..N canaux)
UTILISATEUR        ||--o{    MESSAGE              (1 user publie 0..N messages)
UTILISATEUR        ||--o{    DOCUMENT             (1 user partage 0..N documents)
UTILISATEUR        ||--||    VERIFICATION         (1 user soumet 1 vérification)
UTILISATEUR        ||--o{    SIGNALEMENT          (1 user fait 0..N signalements)
UTILISATEUR        ||--o{    NOTIFICATION         (1 user reçoit 0..N notifications)
UTILISATEUR        ||--o{    ARTICLE_MARCHE       (1 user vend 0..N articles)

UNIVERSITE         ||--o{    FILIERE              (1 univ a 1..N filières)
UNIVERSITE         ||--o{    ESPACE               (1 univ a 0..N espaces)
FILIERE            ||--o{    ESPACE               (1 filière a 0..N espaces)

ESPACE             ||--o{    CANAL                (1 espace contient 1..N canaux)
ESPACE             ||--o{    ESPACE_MEMBRE        (1 espace a 0..N membres)

CANAL              ||--o{    MESSAGE              (1 canal héberge 0..N messages)
CANAL              ||--o{    DOCUMENT             (1 canal contient 0..N documents)
CANAL              ||--o{    CANAL_MEMBRE         (1 canal a 0..N membres)

MESSAGE            ||--o{    MESSAGE              (1 message peut avoir 0..N réponses — auto-référence)
```

---

## 3. MCD — MODÈLE CONCEPTUEL DE DONNÉES

### 3.1 Entités et attributs

```
UTILISATEUR
  # id_utilisateur
  telephone
  nom_complet
  universite
  filiere
  niveau
  statut_verification

ESPACE
  # id_espace
  nom
  type_espace
  universite
  filiere
  date_creation
  est_actif

DOCUMENT
  # id_document
  titre
  url_fichier
  matiere
  type_fichier
  nb_telechargements
  date_partage

OPPORTUNITE
  # id_opportunite
  titre
  type_offre
  domaine
  niveau_requis
  date_limite
  localisation
  est_sponsorisee
  source_url

MESSAGE
  # id_message
  contenu
  date_envoi
  votes_positifs
  est_reponse
  id_parent

VERIFICATION
  # id_verif
  photo_carte_url
  statut
  date_soumission
  date_decision
```

---

### 3.2 Associations et cardinalités

```
UTILISATEUR ——[s'inscrit dans]—— ESPACE
  Cardinalité : (1,1) — (0,N)
  → Un utilisateur s'inscrit dans au moins 1 espace
  → Un espace accueille 0 à N utilisateurs

UTILISATEUR ——[publie]—— DOCUMENT
  Cardinalité : (1,1) — (0,N)
  → Un document est publié par exactement 1 utilisateur
  → Un utilisateur publie 0 à N documents

ESPACE ——[contient]—— DOCUMENT
  Cardinalité : (1,N) — (1,1)
  → Un espace contient 1 à N documents
  → Un document appartient à 1 seul espace

ESPACE ——[héberge]—— MESSAGE
  Cardinalité : (1,N) — (1,1)
  → Un espace héberge 1 à N messages
  → Un message appartient à 1 seul espace

UTILISATEUR ——[soumet]—— VERIFICATION
  Cardinalité : (1,1) — (1,1)
  → Un utilisateur soumet 1 vérification
  → Une vérification appartient à 1 utilisateur

UTILISATEUR ——[consulte]—— OPPORTUNITE
  Cardinalité : (0,N) — (0,N)
  → Un utilisateur consulte 0 à N opportunités
  → Une opportunité est consultée par 0 à N utilisateurs

UTILISATEUR ——[rédige]—— MESSAGE
  Cardinalité : (1,1) — (0,N)
  → Un message est rédigé par 1 utilisateur
  → Un utilisateur rédige 0 à N messages
```

---

## 4. DIAGRAMME DE SÉQUENCE — Inscription et Vérification Étudiant

### 4.1 Acteurs du diagramme

```
[Étudiant]  →  [App Mobile]  →  [API Backend]  →  [Admin]
```

---

### 4.2 Flux complet

```
Étudiant          App Mobile            API Backend           Admin
   |                  |                      |                   |
   |-- saisit tel. -->|                      |                   |
   |                  |-- POST /auth/otp --> |                   |
   |                  |                      |-- envoi OTP SMS   |
   |<-- reçoit OTP ---|                      |                   |
   |-- saisit OTP --> |                      |                   |
   |                  |-- POST /auth/verify->|                   |
   |                  |<-- token JWT --------|                   |
   |                  |                      |                   |
   |-- saisit profil->|                      |                   |
   |   (nom, univ,    |                      |                   |
   |    filière,      |                      |                   |
   |    niveau)       |                      |                   |
   |                  |-- POST /profile ----->|                   |
   |                  |<-- profil créé -------|                   |
   |                  |                      |                   |
   |-- upload carte ->|                      |                   |
   |   étudiante      |                      |                   |
   |                  |-- POST /verify/submit>|                   |
   |                  |                      |-- stocke fichier  |
   |                  |                      |-- crée demande -->|
   |                  |<-- "en attente" ------|                   |
   |<-- notification--|                      |                   |
   |   "soumis"       |                      |                   |
   |                  |                      |                   |
   |                  |                      |<-- admin examine --|
   |                  |                      |                   |
   |                  |                      |   [si validé]     |
   |                  |                      |<-- PATCH /verify  |
   |                  |                      |    /approve       |
   |                  |                      |-- update statut   |
   |                  |                      |-- déclenche notif |
   |<-- notification--|                      |                   |
   |   "vérifié ✓"    |                      |                   |
   |                  |                      |   [si rejeté]     |
   |                  |                      |<-- PATCH /verify  |
   |                  |                      |    /reject        |
   |                  |                      |-- update statut   |
   |                  |                      |-- notif rejet     |
   |<-- notification--|                      |                   |
   |   "rejeté - motif|                      |                   |
```

---

### 4.3 Endpoints impliqués

| Étape | Méthode | Endpoint | Description |
|-------|---------|----------|-------------|
| 1 | POST | `/auth/otp/send` | Envoyer OTP par SMS |
| 2 | POST | `/auth/otp/verify` | Vérifier OTP, retourner token |
| 3 | POST | `/users/profile` | Créer profil académique |
| 4 | POST | `/verification/submit` | Soumettre carte étudiante |
| 5 | GET | `/admin/verifications` | Liste demandes en attente |
| 6 | PATCH | `/admin/verifications/:id/approve` | Valider |
| 7 | PATCH | `/admin/verifications/:id/reject` | Rejeter avec motif |

---

## 5. ARCHITECTURE TECHNIQUE — 4 COUCHES

### 5.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                    COUCHE PRÉSENTATION                          │
│  ┌─────────────────────┐    ┌─────────────────────────────┐    │
│  │   App Mobile        │    │      Web (Next.js)           │    │
│  │   Expo / React Native│    │  campuslink.sn               │    │
│  │   Android (priorité) │    │  Responsive                  │    │
│  │   iOS (secondaire)   │    │                             │    │
│  └─────────────────────┘    └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Firebase Auth (ID Token)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY / BACKEND                      │
│                  NestJS + Fastify (Render)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Auth Guard  │  │   Rate Limit  │  │  Validation (Zod)  │   │
│  │  Firebase    │  │  Throttler    │  │  Response Format   │   │
│  │  Verify      │  │              │  │                    │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICES MÉTIER                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  users   │ │  spaces  │ │  docs    │ │  opportunities   │  │
│  │ profiles │ │ channels │ │ posts    │ │  notifications   │  │
│  │   auth   │ │ members  │ │moderation│ │  marketplace     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               WORKER (Background Jobs)                  │   │
│  │   node-cron + table SQL jobs (sans Redis)               │   │
│  │   Push FCM | Email | SMS | Expiration offres            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                       COUCHE DONNÉES                            │
│  ┌──────────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   PostgreSQL     │    │   Firebase   │    │   Storage    │  │
│  │   (Neon/Supabase)│    │   Auth / FCM │    │  (Firebase   │  │
│  │   Prisma ORM     │    │   Cloud      │    │   ou R2/S3)  │  │
│  │   Migrations     │    │              │    │  Documents   │  │
│  │   Source vérité  │    │              │    │  Images      │  │
│  └──────────────────┘    └──────────────┘    └──────────────┘  │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────┐                      │
│  │   Sentry         │    │   Pino Logs  │                      │
│  │   Monitoring     │    │   JSON       │                      │
│  └──────────────────┘    └──────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Stack complet

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Mobile | Expo / React Native | App Android & iOS |
| Web | Next.js (TypeScript) | Interface web responsive |
| API | NestJS + Fastify | Backend HTTP |
| ORM | Prisma | Accès PostgreSQL type-safe |
| Base de données | PostgreSQL (Neon) | Source de vérité métier |
| Auth | Firebase Auth | OTP / sessions |
| Push | Firebase FCM | Notifications mobile |
| Stockage | Firebase Storage / R2 | Documents & images |
| Hébergement API | Render | Web Service + Worker |
| Monitoring | Sentry + Pino | Erreurs + logs JSON |
| CI/CD | GitHub Actions | Lint → Test → Deploy |

---

## 6. MLD — MODÈLE LOGIQUE DE DONNÉES (Tables SQL)

### 6.1 Tables et clés

```sql
-- Clé primaire = UUID
-- FK = Clé étrangère
-- ? = nullable

TABLE utilisateurs
  id UUID PK
  firebase_uid VARCHAR UNIQUE NOT NULL
  telephone VARCHAR UNIQUE
  email VARCHAR UNIQUE
  role ENUM('student','delegate','admin','superadmin') DEFAULT 'student'
  est_actif BOOLEAN DEFAULT TRUE
  est_banni BOOLEAN DEFAULT FALSE
  banni_le TIMESTAMP?
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP
  deleted_at TIMESTAMP?

TABLE profils
  id UUID PK
  utilisateur_id UUID FK -> utilisateurs(id) UNIQUE
  universite_id UUID FK -> universites(id)?
  filiere_id UUID FK -> filieres(id)?
  prenom VARCHAR NOT NULL
  nom VARCHAR NOT NULL
  avatar_url VARCHAR?
  niveau ENUM('L1','L2','L3','M1','M2')?
  photo_carte_url VARCHAR?
  statut_verification ENUM('pending','verified','rejected') DEFAULT 'pending'
  verifie_le TIMESTAMP?
  score_reputation INTEGER DEFAULT 0
  created_at TIMESTAMP
  updated_at TIMESTAMP

TABLE universites
  id UUID PK
  nom VARCHAR UNIQUE NOT NULL
  ville VARCHAR NOT NULL
  pays VARCHAR DEFAULT 'Senegal'
  logo_url VARCHAR?
  est_actif BOOLEAN DEFAULT TRUE

TABLE filieres
  id UUID PK
  universite_id UUID FK -> universites(id)
  nom VARCHAR NOT NULL
  code VARCHAR?
  est_actif BOOLEAN DEFAULT TRUE
  UNIQUE(nom, universite_id)

TABLE espaces
  id UUID PK
  universite_id UUID FK -> universites(id)?
  filiere_id UUID FK -> filieres(id)?
  nom VARCHAR NOT NULL
  type_espace VARCHAR
  niveau VARCHAR?
  est_public BOOLEAN DEFAULT TRUE
  est_actif BOOLEAN DEFAULT TRUE
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP

TABLE espace_membres
  id UUID PK
  espace_id UUID FK -> espaces(id) ON DELETE CASCADE
  utilisateur_id UUID FK -> utilisateurs(id) ON DELETE CASCADE
  rejoint_le TIMESTAMP DEFAULT NOW()
  UNIQUE(espace_id, utilisateur_id)

TABLE canaux
  id UUID PK
  espace_id UUID FK -> espaces(id) ON DELETE CASCADE
  nom VARCHAR NOT NULL
  description VARCHAR?
  est_public BOOLEAN DEFAULT TRUE
  est_actif BOOLEAN DEFAULT TRUE
  created_at TIMESTAMP
  updated_at TIMESTAMP

TABLE canal_membres
  id UUID PK
  canal_id UUID FK -> canaux(id) ON DELETE CASCADE
  utilisateur_id UUID FK -> utilisateurs(id) ON DELETE CASCADE
  rejoint_le TIMESTAMP DEFAULT NOW()
  UNIQUE(canal_id, utilisateur_id)

TABLE messages
  id UUID PK
  canal_id UUID FK -> canaux(id)
  auteur_id UUID FK -> utilisateurs(id)
  parent_id UUID FK -> messages(id)?   -- auto-référence pour réponses
  type ENUM('annonce','question','ressource','discussion')
  contenu TEXT NOT NULL
  est_epingle BOOLEAN DEFAULT FALSE
  est_masque BOOLEAN DEFAULT FALSE
  votes_positifs INTEGER DEFAULT 0
  est_anonyme BOOLEAN DEFAULT FALSE
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP
  deleted_at TIMESTAMP?

TABLE documents
  id UUID PK
  canal_id UUID FK -> canaux(id)?
  uploader_id UUID FK -> utilisateurs(id)
  titre VARCHAR NOT NULL
  description TEXT?
  type_fichier ENUM('cours','exam','resume','exercice','autre')
  url_fichier VARCHAR NOT NULL
  mime_type VARCHAR NOT NULL
  taille_octets INTEGER NOT NULL
  nb_telechargements INTEGER DEFAULT 0
  est_public BOOLEAN DEFAULT TRUE
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP
  deleted_at TIMESTAMP?

TABLE opportunites
  id UUID PK
  auteur_id UUID FK -> utilisateurs(id)
  titre VARCHAR NOT NULL
  description TEXT NOT NULL
  entreprise VARCHAR?
  type_offre ENUM('stage','emploi','bourse','concours','evenement')
  domaine VARCHAR?
  niveau_requis ENUM('L1','L2','L3','M1','M2','tous') DEFAULT 'tous'
  date_limite TIMESTAMP?
  localisation VARCHAR?
  url_externe VARCHAR?
  est_active BOOLEAN DEFAULT TRUE
  est_expiree BOOLEAN DEFAULT FALSE
  nb_vues INTEGER DEFAULT 0
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP
  deleted_at TIMESTAMP?

TABLE opportunite_tags
  id UUID PK
  opportunite_id UUID FK -> opportunites(id) ON DELETE CASCADE
  tag VARCHAR NOT NULL
  INDEX(opportunite_id)
  INDEX(tag)

TABLE verifications
  id UUID PK
  utilisateur_id UUID FK -> utilisateurs(id) UNIQUE
  photo_carte_url VARCHAR NOT NULL
  statut ENUM('pending','verified','rejected') DEFAULT 'pending'
  soumis_le TIMESTAMP DEFAULT NOW()
  decide_le TIMESTAMP?
  admin_id UUID FK -> utilisateurs(id)?
  motif_rejet TEXT?

TABLE signalements
  id UUID PK
  rapporteur_id UUID FK -> utilisateurs(id)
  cible_user_id UUID FK -> utilisateurs(id)?
  message_id UUID FK -> messages(id)?
  document_id UUID FK -> documents(id)?
  opportunite_id UUID FK -> opportunites(id)?
  raison ENUM('spam','inapproprie','harcelement','desinformation','autre')
  details TEXT?
  statut ENUM('ouvert','en_cours','resolu','classe') DEFAULT 'ouvert'
  resolu_le TIMESTAMP?
  created_at TIMESTAMP DEFAULT NOW()

TABLE actions_moderation
  id UUID PK
  moderateur_id UUID FK -> utilisateurs(id)
  cible_id UUID FK -> utilisateurs(id)
  action ENUM('avertissement','masquer','supprimer','suspendre','bannir')
  raison TEXT NOT NULL
  created_at TIMESTAMP DEFAULT NOW()

TABLE notifications
  id UUID PK
  utilisateur_id UUID FK -> utilisateurs(id) ON DELETE CASCADE
  type ENUM('opportunite','message','document','mention','systeme','moderation')
  titre VARCHAR NOT NULL
  corps TEXT NOT NULL
  donnees JSONB?
  est_lue BOOLEAN DEFAULT FALSE
  lue_le TIMESTAMP?
  created_at TIMESTAMP DEFAULT NOW()

TABLE tokens_appareil
  id UUID PK
  utilisateur_id UUID FK -> utilisateurs(id) ON DELETE CASCADE
  token VARCHAR UNIQUE NOT NULL
  plateforme VARCHAR NOT NULL  -- 'android' | 'ios' | 'web'
  est_actif BOOLEAN DEFAULT TRUE
  created_at TIMESTAMP
  updated_at TIMESTAMP

TABLE jobs
  id UUID PK
  type ENUM('push','email','sms','expiration','nettoyage','rappel')
  statut ENUM('pending','processing','done','failed') DEFAULT 'pending'
  payload JSONB NOT NULL
  tentatives INTEGER DEFAULT 0
  max_tentatives INTEGER DEFAULT 3
  derniere_erreur TEXT?
  prevu_le TIMESTAMP DEFAULT NOW()
  traite_le TIMESTAMP?
  created_at TIMESTAMP
  updated_at TIMESTAMP

TABLE audit_logs
  id UUID PK
  utilisateur_id UUID FK -> utilisateurs(id)?
  action VARCHAR NOT NULL
  ressource VARCHAR NOT NULL
  ressource_id UUID?
  metadata JSONB?
  ip VARCHAR?
  user_agent VARCHAR?
  created_at TIMESTAMP DEFAULT NOW()

TABLE articles_marche
  id UUID PK
  vendeur_id UUID FK -> utilisateurs(id)
  titre VARCHAR NOT NULL
  description TEXT NOT NULL
  prix DECIMAL?
  categorie ENUM('service','materiel','tutorat','autre')
  statut ENUM('actif','vendu','archive') DEFAULT 'actif'
  images_urls VARCHAR[]
  created_at TIMESTAMP
  updated_at TIMESTAMP
  deleted_at TIMESTAMP?

TABLE ips_bloques
  id UUID PK
  ip VARCHAR UNIQUE NOT NULL
  raison TEXT?
  bloque_le TIMESTAMP DEFAULT NOW()
  expire_le TIMESTAMP?
```

---

## 7. WIREFRAME MOBILE — Description textuelle annotée

### 7.1 Écran d'Accueil (Home)

```
┌─────────────────────────────────────┐
│  kamplink              🔔  👤        │  ← Header : logo + icône notif + profil
├─────────────────────────────────────┤
│  Bonjour, Moussa 👋                 │  ← Salutation personnalisée
│  L3 Informatique · UCAD  ✓         │  ← Identité académique vérifiée
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │  🎯  3 nouvelles opportunités│   │  ← Carte "Opportunités du jour"
│  │  dans ta filière             │   │    filtrées par niveau/filière
│  │           Voir tout →        │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  FIL D'ACTUALITÉ                    │  ← Section titre
│  ─────────────────────────────────  │
│  ┌─────────────────────────────┐   │
│  │ 📌 [Délégué] Rappel examen  │   │  ← Post épinglé (badge délégué)
│  │ Informatique · L3 · 14h    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📄 Nouveau cours partagé    │   │  ← Card document
│  │ Algorithmes S5 · 2.3 Mo     │   │
│  │ ↓ 12 téléch.    Il y a 1h   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 💬 Question ouverte         │   │  ← Card message/question
│  │ "Comment préparer le TP ?" │   │
│  │ 5 réponses · Il y a 3h      │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  🏠      🏛️      💼      🛒      👤 │  ← Barre navigation (5 onglets)
│ Accueil Communauté Opport. Market. Profil
└─────────────────────────────────────┘
```

---

### 7.2 Écran Communauté

```
┌─────────────────────────────────────┐
│  ← Communauté                  🔍   │
├─────────────────────────────────────┤
│  MON ESPACE : L3 Informatique - UCAD│
│  ─────────────────────────────────  │
│  # général          [47 membres]    │
│  # cours-algo       [32 membres]    │
│  # examens          [47 membres]    │
│  # documents        [47 membres]    │
│  # hors-sujet       [23 membres]    │
├─────────────────────────────────────┤
│  AUTRES ESPACES                     │
│  ─────────────────────────────────  │
│  🏛️ UCAD — L3 Gestion              │
│  🏛️ UGB — L2 Droit                 │
│  + Rejoindre un espace              │
└─────────────────────────────────────┘
```

---

### 7.3 Écran Opportunités

```
┌─────────────────────────────────────┐
│  Opportunités               🔍  ⚙️  │
├─────────────────────────────────────┤
│  [Tous] [Stages] [Emplois] [Bourses]│  ← Filtres horizontaux
├─────────────────────────────────────┤
│  Filtre actif : L3 · Informatique   │  ← Filtre auto depuis profil
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ 🏢 Stage Développeur Web    │   │
│  │ Orange Sénégal · Dakar      │   │
│  │ 📅 Limite : 15 mai 2025     │   │
│  │ L3 requis    ↗ Voir l'offre  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🎓 Bourse Mastercard Found. │   │
│  │ Tous niveaux · International │   │
│  │ 📅 Limite : 30 juin 2025    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

### 7.4 Écran Profil

```
┌─────────────────────────────────────┐
│  Mon Profil                    ✏️   │
├─────────────────────────────────────┤
│           [Photo]                   │
│        Moussa Diallo                │
│    ✅ Étudiant vérifié             │
│    ⭐ Score : 87 pts               │
├─────────────────────────────────────┤
│  📚 L3 Informatique                 │
│  🏛️ UCAD — Dakar                  │
│  📱 +221 77 000 00 00               │
├─────────────────────────────────────┤
│  MES DOCUMENTS PARTAGÉS   [3]       │
│  ─────────────────────────────────  │
│  Cours Algo S5.pdf                  │
│  Examen 2023 BD.pdf                 │
│  TP Réseaux.zip                     │
├─────────────────────────────────────┤
│  ⚙️ Paramètres                      │
│  🔒 Confidentialité                 │
│  🚪 Se déconnecter                  │
└─────────────────────────────────────┘
```

---

## 8. CE QUI RESTE À PRODUIRE

Pour compléter la documentation de soutenance :

| Livrable | Statut | Description |
|---------|--------|-------------|
| Diagramme de cas d'utilisation | ✅ Section 1 | 4 acteurs, 29 UC |
| Diagramme de classes | ✅ Section 2 | 13 classes typées |
| MCD | ✅ Section 3 | 7 associations avec cardinalités |
| Diagramme de séquence (inscription) | ✅ Section 4 | Flux OTP → vérification |
| Architecture technique | ✅ Section 5 | 4 couches + stack |
| MLD (tables SQL) | ✅ Section 6 | 20 tables avec PK/FK |
| Wireframes mobile | ✅ Section 7 | 4 écrans annotés |
| Diagramme de séquence (partage doc) | ⬜ À produire | |
| Diagramme de séquence (opportunité) | ⬜ À produire | |
| Wireframe écran Communauté détaillé | ⬜ À produire | |
| Cahier des charges complet | ⬜ À produire | |
| Documentation fonctionnelle par module | ⬜ À produire | |

---

## 9. RÈGLES MÉTIER CLÉS

```
RG-01 : Un utilisateur ne peut partager un document que s'il appartient à l'espace cible.
RG-02 : Un utilisateur non vérifié peut lire mais ne peut pas partager de document.
RG-03 : Un délégué est promu uniquement par un admin — rôle attribué manuellement.
RG-04 : Une opportunité expire automatiquement à sa date_limite (job cron nuit).
RG-05 : Un message signalé 3 fois est automatiquement mis en file de modération.
RG-06 : Le score de réputation augmente : +1 par document partagé, +1 par vote positif reçu.
RG-07 : Les notifications sont envoyées uniquement pour : nouvelle offre filière, réponse, 
         mention directe, annonce système. Jamais pour les simples likes.
RG-08 : Un token FCM inactif depuis 30 jours est automatiquement invalidé (job cleanup).
RG-09 : Toute action admin sur un compte est tracée dans audit_logs.
RG-10 : Les données sensibles (carte étudiante) sont accessibles uniquement aux admins.
```

---

*Document généré pour kamplink — Phase conception*  
*Stack : NestJS · PostgreSQL · Prisma · Firebase · Render*
