# 📚 CampusLink Backend - Documentation Complète

> **Dernière mise à jour :** Avril 2025 | **Version :** 1.0.0

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Stack Technique](#2-stack-technique)
3. [Architecture Globale](#3-architecture-globale)
4. [Structure du Projet](#4-structure-du-projet)
5. [Modules Métier](#5-modules-métier)
6. [Services Partagés](#6-services-partagés)
7. [Sécurité](#7-sécurité)
8. [Redis & Cache](#8-redis--cache)
9. [Base de Données](#9-base-de-données)
10. [Documentation Existante](#10-documentation-existante)

---

## 1. Vue d'Ensemble

CampusLink est une **plateforme sociale académique** pour étudiants sénégalais.

### Philosophie Architecture
- ✅ Source unique de vérité : PostgreSQL
- ✅ Cache temporaire uniquement : Redis (Upstash)
- ✅ Fail Open : L'application fonctionne sans Redis
- ✅ Zero Trust : Validation stricte à tous les niveaux
- ✅ TTL obligatoire : Aucune donnée persistante dans Redis

---

## 2. Stack Technique

| Technologie | Version | Rôle |
|-------------|---------|------|
| **NestJS** | ^11.0.1 | Framework Node.js modulaire |
| **TypeScript** | ^5.9.3 | Langage typé |
| **PostgreSQL** | 14+ | Base de données principale |
| **Prisma** | ^6.16.3 | ORM et migrations |
| **Upstash Redis** | ^1.34.7 | Cache temporaire via REST API |
| **Firebase Admin** | ^13.7.0 | Authentification JWT |
| **Bull** | ^4.16.5 | Queue system pour jobs |
| **Socket.io** | ^4.8.1 | WebSocket bidirectionnel |
| **Elasticsearch** | ^8.17.0 | Moteur de recherche |
| **Sentry** | ^9.0.0 | Monitoring erreurs |

---

## 3. Architecture Globale

### Modules NestJS

```
AppModule (Root)
│
├── MODULES GLOBAUX
│   ├── FirebaseModule    → Auth Firebase
│   ├── PrismaModule      → Connexion DB
│   ├── RedisModule       → Cache Upstash (GLOBAL)
│   ├── SecurityModule    → Guards & protection
│   ├── CommonModule      → Services partagés
│   ├── SearchModule      → Elasticsearch
│   └── QueueModule       → Bull jobs
│
├── MODULES MÉTIER
│   ├── AuthModule        → Login/Register/Password
│   ├── UsersModule       → Profils & Gestion users
│   ├── EspacesModule     → Espaces communautaires
│   ├── CanauxModule      → Canaux de discussion
│   ├── MessagesModule    → Messages & threads
│   ├── DocumentsModule   → Partage fichiers
│   ├── OpportunitesModule → Offres emploi/stage
│   ├── NotificationsModule → Push & in-app
│   ├── SignalementsModule → Modération
│   └── ChatModule        → WebSocket temps réel
│
└── MODULES MONITORING
    └── HealthModule      → Health checks (/health)
```

---

## 4. Structure du Projet

```
c:\CampusLink\backend\
├── 📁 prisma/
│   └── schema.prisma          → Schéma complet DB (600 lignes)
│
├── 📁 src/
│   ├── 📄 main.ts             → Point d'entrée (bootstrap)
│   ├── 📄 app.module.ts       → Module racine
│   │
│   ├── 📁 auth/               → Authentification
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.guard.ts
│   │   └── dto/
│   │
│   ├── 📁 users/              → Gestion utilisateurs
│   ├── 📁 espaces/            → Espaces communautaires
│   ├── 📁 canaux/             → Canaux de discussion
│   ├── 📁 messages/           → Messages & réponses
│   ├── 📁 documents/          → Partage de documents
│   ├── 📁 opportunites/       → Opportunités professionnelles
│   ├── 📁 notifications/      → Notifications system
│   ├── 📁 signalements/       → Signalements & modération
│   ├── 📁 chat/               → WebSocket chat temps réel
│   ├── 📁 firebase/           → Configuration Firebase
│   ├── 📁 prisma/             → Service Prisma
│   ├── 📁 redis/              → 🔥 MODULE REDIS (NOUVEAU)
│   │   ├── redis.service.ts       → Client Upstash
│   │   ├── redis.module.ts          → Module global
│   │   ├── redis-throttler.guard.ts → Rate limiting custom
│   │   ├── redis-throttler.decorator.ts → @Throttle()
│   │   ├── security-redis.service.ts → Anti-brute force
│   │   ├── cache.service.ts         → Cache léger
│   │   └── redis-health.indicator.ts → Health check
│   ├── 📁 security/           → Sécurité
│   ├── 📁 queue/              → Files de tâches (Bull)
│   ├── 📁 search/             → Elasticsearch
│   ├── 📁 health/             → Health checks
│   └── 📁 common/             → Services communs (filters, interceptors)
│
├── 📁 test/                   → Tests E2E
├── 📄 package.json            → Dépendances
└── 📄 .env.example            → Variables d'environnement
```

---

## 5. Modules Métier

### 5.1 AuthModule
**Endpoints :**
```
POST /api/v1/auth/login              → Rate limit: 5/15min
POST /api/v1/auth/forgot-password    → Rate limit: 3/15min
POST /api/v1/auth/reset-password   → Rate limit: 3/15min
```

**Fonctionnalités :**
- ✅ Login avec token Firebase
- ✅ Création automatique de profil
- ✅ Mot de passe oublié (token temporaire)
- ✅ Réinitialisation mot de passe
- ✅ Rate limiting strict via @Throttle()

### 5.2 UsersModule
**Rôles :** `student` | `delegate` | `admin` | `superadmin`

**Fonctionnalités :**
- ✅ Création/Mise à jour profil
- ✅ Demande de vérification (carte étudiant)
- ✅ Gestion des rôles
- ✅ Bannissement/débannissement
- ✅ Score de réputation

### 5.3 EspacesModule
**Hiérarchie :** Université → Filière → Niveau → Espace

### 5.4 CanauxModule
- Canaux publics/privés dans les espaces

### 5.5 MessagesModule
- Messages, réponses (threads), anonymes, épinglage, votes

### 5.6 DocumentsModule
- Upload : cours, examen, résumé, exercice

### 5.7 OpportunitesModule
- Types : stage, emploi, bourse, concours, événement

### 5.8 NotificationsModule
- Push Firebase + notifications in-app

### 5.9 SignalementsModule
- Workflow : ouvert → en cours → résolu/classé

### 5.10 ChatModule
- WebSocket temps réel avec Socket.io

---

## 6. Services Partagés

### 6.1 FirebaseService
- ✅ Vérification tokens JWT Firebase
- ✅ Envoi notifications push

### 6.2 PrismaService
- Connexion PostgreSQL avec lifecycle hooks

### 6.3 RedisService
**Configuration :**
```env
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**Méthodes :**
```typescript
await redisService.get('key');
await redisService.set('key', 'value', 60); // TTL 60s
await redisService.incr('counter', 60);
await redisService.ttl('key');
await redisService.exists('key');
await redisService.del('key');
```

### 6.4 SecurityRedisService
- Track login attempts (max 5 échecs / 15min)
- Block IPs/users avec TTL
- Reset tokens hashés (bcryptjs)

### 6.5 CacheService
- Cache profils utilisateurs (TTL 60s)
- Cache canaux & espaces (TTL 30-120s)
- Invalidation manuelle

### 6.6 SanitizationService
- HTML sanitization via DOMPurify
- Tags : b, i, em, strong, p, br, ul, ol, li, a

---

## 7. Sécurité

### 7.1 AuthGuard
```typescript
@UseGuards(AuthGuard)
@Get('profile')
getProfile(@Req() req) {
  return req.user;
}
```

### 7.2 RedisThrottlerGuard
```typescript
@Throttle({ ttl: 60, limit: 5, blockDuration: 300 })
@Post('login')
```

**Clés Redis :**
- `rate:{ip}` → Compteur requêtes
- `block:{ip}` → Flag blocage

### 7.3 IpBlockerGuard
- Check DB `IpBloquee` avant accès

### 7.4 Headers de Sécurité (Helmet)
```typescript
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
```

### 7.5 Interceptors & Filtres

| Composant | Fichier | Rôle |
|-----------|---------|------|
| AllExceptionsFilter | `common/filters/all-exceptions.filter.ts` | Catch toutes les exceptions, format standardisé |
| LoggingInterceptor | `common/interceptors/logging.interceptor.ts` | Log requêtes (user, méthode, durée) |
| ResponseTransformInterceptor | `common/interceptors/response-transform.interceptor.ts` | Wrapper réponse uniforme |

**Format réponse succès :**
```json
{
  "success": true,
  "data": { ... },
  "message": "Opération réussie",
  "statusCode": 200,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/api/v1/users/profile"
}
```

**Format réponse erreur :**
```json
{
  "success": false,
  "message": "Description de l'erreur",
  "error": "ErrorType",
  "statusCode": 400,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/api/v1/auth/login"
}
```

---

## 8. Redis & Cache

### 8.1 Architecture Redis

**Règles Strictes :**
- ✅ Données temporaires uniquement
- ✅ TTL obligatoire sur TOUTES les clés
- ✅ Clés compactes (préfixes courts)
- ✅ Fail open : Redis down = app fonctionne
- ✅ Max 250MB (Upstash Free Tier)

### 8.2 Types de Clés Redis

| Préfix | Usage | TTL |
|--------|-------|-----|
| `rate:` | Rate limiting counters | 60s |
| `block:` | Blocage IPs/users | 300-900s |
| `login:` | Tentatives connexion | 900s |
| `reset:` | Tokens reset password | 600s |
| `cache:user:` | Cache profils | 60s |
| `cache:canal:` | Cache canaux | 30s |
| `cache:espace:` | Cache espaces | 120s |

---

## 9. Base de Données

### 9.1 Tables Principales (Prisma)

| Table | Description |
|-------|-------------|
| **Utilisateur** | Comptes utilisateurs (firebase_uid, rôle, banni) |
| **Profil** | Informations profil (prénom, nom, université, filière) |
| **Universite** | Liste universités |
| **Filiere** | Filières par université |
| **Espace** | Espaces communautaires |
| **EspaceMembre** | Membres des espaces |
| **Canal** | Canaux de discussion |
| **CanalMembre** | Membres des canaux |
| **Message** | Messages & réponses (type: annonce/question/ressource/discussion) |
| **Document** | Documents partagés (type: cours/examen/résumé/exercice) |
| **Opportunite** | Offres stage/emploi/bourse/concours |
| **Notification** | Notifications in-app |
| **Signalement** | Signalements (raisons: spam/inapproprié/harcèlement) |
| **Verification** | Demandes vérification carte étudiant |
| **TentativeConnexion** | Log sécurité login attempts |
| **TokenResetPassword** | Tokens reset password |
| **IpBloquee** | IPs bloquées |
| **AuditLog** | Logs audit |

### 9.2 ENUMS Principaux

```prisma
enum Role { student, delegate, admin, superadmin }
enum Niveau { L1, L2, L3, M1, M2 }
enum TypeMessage { annonce, question, ressource, discussion }
enum TypeOffre { stage, emploi, bourse, concours, evenement }
enum RaisonSignalement { spam, inapproprie, harcelement, desinformation, autre }
enum ActionModeration { avertissement, masquer, supprimer, suspendre, bannir }
```

---

## 10. Documentation Existante

| Fichier | Description |
|---------|-------------|
| `README.md` | README principal |
| `API_README.md` | Documentation API détaillée |
| `REDIS_ARCHITECTURE.md` | Architecture Redis (320 lignes) |
| `UPSTASH_INTEGRATION_GUIDE.md` | Guide intégration Upstash (377 lignes) |
| `SECURITY_IMPLEMENTATION.md` | Implémentation sécurité |
| `AMELIORATIONS_IMPLEMENTEES.md` | Améliorations réalisées |
| `ANALYSE_BACKEND.md` | Analyse complète backend |
| `VALIDATION.md` | Validation & checklist |
| `explication/DOCUMENTATION_COMPLETE.md` | Ce fichier |

---

## 🎯 Résumé des Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `src/main.ts` | Bootstrap application (119 lignes) |
| `src/app.module.ts` | Module racine avec tous les imports |
| `src/redis/redis.service.ts` | Client Upstash Redis |
| `src/redis/redis-throttler.guard.ts` | Rate limiting custom |
| `src/auth/auth.guard.ts` | Guard authentification Firebase |
| `src/common/filters/all-exceptions.filter.ts` | Filtre exceptions global |
| `prisma/schema.prisma` | Schéma base de données (600 lignes) |
| `.env.example` | Variables d'environnement complètes |

---

**✅ Backend CampusLink complet, sécurisé et optimisé pour production !**
