# 📊 CampusLink - Diagrammes d'Architecture

> **Dossier:** `c:\CampusLink\diagramme\`  
> **Mis à jour:** Avril 2025  
> **Description:** Diagrammes Mermaid reflétant l'architecture actuelle avec Redis, sécurité et optimisation

---

## 📁 Liste des Diagrammes

### 1. `01-architecture-globale.mmd`
**Vue d'ensemble complète de l'architecture CampusLink**

- Couche Client (React/Mobile)
- Firebase Auth
- NestJS Application avec Guards, Interceptors, Controllers
- Services Partagés (Redis, Prisma, Firebase, etc.)
- Data Layer (PostgreSQL + Redis Upstash)
- Services Externes (FCM, Elasticsearch, Sentry)

**Visualise:** Le flux complet d'une requête à travers toutes les couches

---

### 2. `02-flux-authentification.mmd`
**Séquence détaillée du login et reset password**

Inclut :
- Authentification Firebase (OTP/Email)
- Rate limiting avec Redis
- Anti-brute force (max 5 tentatives)
- Stockage tokens reset (hashés + TTL)
- Gestion des blocs et déblocages

**Visualise:** `POST /api/v1/auth/login` et `POST /api/v1/auth/reset-password`

---

### 3. `03-architecture-redis.mmd`
**Architecture Redis Upstash détaillée**

Montre :
- Services Redis (RedisService, SecurityRedisService, CacheService)
- Types de clés avec leurs patterns et TTL
- Stratégie Fail Open (Redis down = app fonctionne)
- Cache invalidation
- Fallback vers PostgreSQL

**Visualise:** Comment Redis s'intègre à NestJS avec TTL obligatoire

---

### 4. `04-securite-couches.mmd`
**Architecture sécurité multi-couches (Defense in Depth)**

5 couches de sécurité :
1. 🔴 Réseau & Transport (HTTPS, CORS, Helmet)
2. 🟠 Rate Limiting & Protection (Throttlers, Brute force)
3. 🟡 Authentification & Autorisation (JWT, Guards, Roles)
4. 🟢 Validation & Sanitization (DTOs, DOMPurify)
5. 🔵 Data & Audit (Prisma, Logs, Encryption)

Plus monitoring (Sentry, Health checks)

---

### 5. `05-modules-nestjs.mmd`
**Structure des modules NestJS**

Organisation :
- Modules Globaux (Redis, Prisma, Firebase, Security)
- Modules Métier (Auth, Users, Espaces, Canaux, etc.)
- Module Monitoring (Health)
- Services partagés et leurs dépendances
- Guards et Interceptors globaux

**Visualise:** Les dépendances entre modules et services

---

### 6. `06-flux-request-complete.mmd`
**Séquence complète d'une requête HTTP**

Exemple : `GET /api/v1/users/profile`

Étapes détaillées :
1. Envoi requête client
2. Nginx / Load Balancer
3. CORS & Helmet
4. Rate Limiting (Redis check)
5. IP Blocking
6. Auth Guard (JWT verification)
7. Logging Interceptor
8. Controller → Service
9. Cache check (Redis)
10. Database query (Prisma)
11. Cache set (Redis)
12. Response Transform
13. Retour client

Avec exemple de gestion d'erreur

---

### 7. `07-schema-database.mmd`
**Schéma Entity-Relation de la base PostgreSQL**

Toutes les tables (26 tables) :
- Utilisateurs & Profils
- Universités & Filières
- Espaces & Canaux
- Messages & Documents
- Opportunités & Tags
- Notifications & Tokens
- Signalements & Modération
- Sécurité (tentatives, reset tokens, IPs bloquées)
- Jobs & Audit logs
- Marketplace (Phase 2)

**Visualise:** Relations complètes avec cardinalités

---

### 8. `08-redis-keys-structure.mmd`
**Structure détaillée des clés Redis**

Patterns par catégorie :
- ⚡ Rate Limiting : `rate:{ip}`, `block:{ip}`
- 🛡️ Sécurité : `login:{ip}:{userId}`, `reset:{userId}:{hash}`, `otp:{phone}`
- 💾 Cache : `cache:user:{id}`, `cache:canal:{id}`, `cache:espace:{id}`
- 📱 Sessions : `session:{sessionId}`

Inclut :
- Règles des clés (TTL obligatoire, fail open, etc.)
- Matrice des TTL (court/moyen/long)
- Opérations Redis (GET, SET, INCR, DEL, etc.)

---

## 🚀 Comment Visualiser

### Option 1: Markdown Viewer avec Mermaid
La plupart des IDE modernes (VS Code avec extension Mermaid) affichent les diagrammes directement.

### Option 2: Mermaid Live Editor
1. Copier le contenu d'un fichier `.mmd`
2. Aller sur [mermaid.live](https://mermaid.live)
3. Coller et visualiser

### Option 3: GitHub/GitLab
Les fichiers Mermaid sont rendus automatiquement sur GitHub/GitLab.

---

## 📊 Résumé des Mises à Jour (Avril 2025)

### ✅ Nouveautés inclues
| Feature | Diagrammes concernés |
|---------|---------------------|
| **Redis Upstash** | 01, 02, 03, 05, 06, 08 |
| **Rate Limiting** | 01, 02, 04, 06 |
| **Anti-Brute Force** | 02, 03, 04 |
| **Security Guards** | 01, 04, 05 |
| **Cache Service** | 03, 06, 08 |
| **TTL Management** | 03, 08 |
| **Fail Open Strategy** | 03, 08 |
| **Multi-layer Security** | 04 |

### 🔄 Comparé aux anciennes versions
- ❌ Sans Redis
- ❌ Sans rate limiting custom
- ❌ Sans anti-brute force
- ❌ Sans TTL enforcement
- ✅ **Maintenant :** Tout est intégré et optimisé pour Upstash Free Tier

---

## 🎯 Utilisation Recommandée

| Pour comprendre... | Utiliser... |
|-------------------|-------------|
| Vue globale | `01-architecture-globale.mmd` |
| Comment le login fonctionne | `02-flux-authentification.mmd` |
| Comment Redis est utilisé | `03-architecture-redis.mmd` |
| La sécurité en couches | `04-securite-couches.mmd` |
| Structure du code | `05-modules-nestjs.mmd` |
| Le passage d'une requête | `06-flux-request-complete.mmd` |
| La base de données | `07-schema-database.mmd` |
| Les clés Redis | `08-redis-keys-structure.mmd` |

---

## 📝 Notes

- Tous les diagrammes utilisent **Mermaid syntax**
- Compatible avec GitHub, GitLab, Notion, VS Code
- Les couleurs reflètent les couches fonctionnelles
- Les 🔥 indiquent les composants Redis

**Besoin de modifications ?** Éditez les fichiers `.mmd` directement !
