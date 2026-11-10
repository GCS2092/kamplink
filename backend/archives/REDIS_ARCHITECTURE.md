# 🔴 Architecture Redis Optimisée - CampusLink

## 📋 Vue d'Ensemble

Cette documentation décrit l'architecture Redis optimisée pour **Upstash Free Tier** (250MB stockage / 10GB bandwidth) avec une utilisation minimale et efficace des ressources.

### Principes Fondamentaux

- ✅ **Données temporaires uniquement** - TTL obligatoire sur toutes les clés
- ✅ **Données légères** - Pas d'objets volumineux (>5KB interdit)
- ✅ **Fallback automatique** - App fonctionne sans Redis
- ✅ **Source de vérité = PostgreSQL** - Redis = cache + sécurité uniquement

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application NestJS                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Rate Limit  │  │   Security  │  │    Cache    │     │
│  │   (Redis)   │  │   (Redis)   │  │   (Redis)   │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │            │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐     │
│  │  Redis Keys │  │  Redis Keys │  │  Redis Keys │     │
│  │ rate:ip:*   │  │ auth:login  │  │ cache:prof  │     │
│  │ rate:u:*    │  │ auth:block  │  │ cache:canal │     │
│  │             │  │ auth:reset  │  │ cache:espac │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                │                │            │
│         └────────────────┼────────────────┘            │
│                          │                             │
│              ┌─────────────┴─────────────┐               │
│              │    RedisService (Core)    │               │
│              │   - Connection manager    │               │
│              │   - Error handling        │               │
│              │   - Fallback logic          │               │
│              └─────────────┬─────────────┘               │
│                            │                             │
│              ┌─────────────┴─────────────┐               │
│              │     Upstash Redis          │               │
│              │   (Free Tier: 250MB/10GB)  │               │
│              └───────────────────────────┘               │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              PostgreSQL (Source of Truth)         │    │
│  │     - Users, Messages, Documents, etc.            │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Structure des Clés Redis

### 1. Rate Limiting (`rate:*`)

| Clé | Format | TTL | Description |
|-----|--------|-----|-------------|
| `rate:ip:<ip>` | counter | 60s | Compteur requêtes par IP |
| `rate:u:<userId>` | counter | 60s | Compteur requêtes par utilisateur |
| `block:ip:<ip>` | flag | 300s | IP bloqué temporairement |
| `block:u:<userId>` | flag | 300s | Utilisateur bloqué |

**Exemple:**
```
rate:ip:192_168_1_1 → 45 (45 requêtes dans la minute)
rate:u:user_abc123 → 12 (12 requêtes)
block:ip:192_168_1_1 → 1 (IP bloquée)
```

### 2. Sécurité Authentication (`auth:*`)

| Clé | Format | TTL | Description |
|-----|--------|-----|-------------|
| `auth:login:<id>` | counter | 900s | Tentatives login échouées |
| `auth:block:<id>` | flag | 900s | Compte bloqué après 3 échecs |
| `auth:reset:<hash>` | JSON | 600s | Token reset password |
| `auth:reset:user:<id>` | array | 600s | Liste tokens actifs par user |

**Exemple:**
```
auth:login:user_abc123 → 2 (2 échecs)
auth:block:user_abc123 → 1 (compte bloqué)
auth:reset:a3f8b2... → {"userId":"abc","ts":1234567890}
```

### 3. Cache Léger (`cache:*`)

| Clé | Format | TTL | Description |
|-----|--------|-----|-------------|
| `cache:profile:<id>` | JSON | 60s | Profil utilisateur (light) |
| `cache:canal:<id>` | JSON | 120s | Info canal (light) |
| `cache:espace:<id>` | JSON | 120s | Info espace (light) |
| `cache:count:<key>` | number | 30s | Compteurs calculés |

**Structure d'un profil en cache (light):**
```json
{
  "id": "uuid",
  "prenom": "John",
  "nom": "Doe",
  "avatarUrl": "https://...",
  "statutVerification": "VERIFIE",
  "scoreReputation": 150
}
```

---

## 🔒 Sécurité & Optimisations

### 1. Tous les TTL sont obligatoires

```typescript
// ❌ INTERDIT - Pas de TTL
await redis.set('key', value);

// ✅ OBLIGATOIRE - TTL requis
await redis.set('key', value, { ex: 60 });
```

### 2. Taille maximale des valeurs

```typescript
// ❌ INTERDIT - Objet trop volumineux (>5KB)
await cacheService.set('profile:user123', fullUserObjectWithHistory);

// ✅ AUTORISÉ - Objet léger (<5KB)
await cacheService.cacheProfile(userId, lightProfile);
```

### 3. Fallback si Redis down

```typescript
// RedisService.ts
async get(key: string) {
  if (!this.isAvailable) return null; // Fallback: null → va chercher en DB
  
  try {
    return await this.client.get(key);
  } catch (error) {
    this.logger.warn(`Redis GET failed: ${error.message}`);
    return null; // Fail open
  }
}
```

---

## 🎯 Utilisation des Services

### Rate Limiting

```typescript
import { Throttle, ThrottleAuth, ThrottleApi } from './redis/redis-throttler.decorator';

// Strict: 5 tentatives par 15min
@ThrottleAuth()
@Post('login')
async login() { }

// Standard: 100 requêtes par minute
@ThrottleApi()
@Get('users')
async getUsers() { }

// Custom
@Throttle({ ttl: 60, limit: 30, blockDuration: 120 })
@Get('search')
async search() { }
```

### Security Service

```typescript
import { SecurityRedisService } from './redis/security-redis.service';

constructor(private securityRedis: SecurityRedisService) {}

// Login
async handleLogin(identifier: string) {
  // Vérifier si bloqué
  const { blocked, remainingSeconds } = await this.securityRedis.isLoginBlocked(identifier);
  if (blocked) {
    throw new HttpException(`Compte bloqué ${remainingSeconds}s`, 429);
  }

  // Tentative échouée
  const remaining = await this.securityRedis.recordFailedLogin(identifier);
  if (remaining === null) {
    throw new HttpException('Compte bloqué', 429);
  }

  // Login réussi → clear
  await this.securityRedis.clearLoginAttempts(identifier);
}

// Reset Password
async createResetToken(userId: string) {
  const token = await this.securityRedis.createResetToken(userId);
  // Envoyer token par email
}

async resetPassword(token: string, newPassword: string) {
  const userId = await this.securityRedis.validateResetToken(token);
  if (!userId) throw new Error('Token invalide ou expiré');
  
  // Update password...
  
  // Invalider le token
  await this.securityRedis.invalidateResetToken(token);
}
```

### Cache Service

```typescript
import { CacheService } from './redis/cache.service';

constructor(private cache: CacheService, private prisma: PrismaService) {}

async getProfile(userId: string) {
  // 1. Essayer cache
  let profile = await this.cache.getCachedProfile(userId);
  
  if (!profile) {
    // 2. Charger depuis DB
    profile = await this.prisma.profil.findUnique({ where: { utilisateurId: userId } });
    
    // 3. Mettre en cache (light)
    await this.cache.cacheProfile(userId, profile);
  }
  
  return profile;
}

// Invalidation après modification
async updateProfile(userId: string, data: UpdateProfileDto) {
  await this.prisma.profil.update({ where: { utilisateurId: userId }, data });
  await this.cache.invalidateProfile(userId);
}
```

---

## 📊 Optimisations pour Upstash Free Tier

### Estimation de la Consommation

| Type de clé | Nombre estimé | Taille moyenne | Total |
|-------------|---------------|----------------|-------|
| rate:* (actives) | 500 | 20 bytes | 10 KB |
| auth:login:* | 100 | 15 bytes | 1.5 KB |
| auth:block:* | 20 | 10 bytes | 200 B |
| auth:reset:* | 50 | 100 bytes | 5 KB |
| cache:profile:* | 200 | 500 bytes | 100 KB |
| cache:canal:* | 50 | 300 bytes | 15 KB |
| **TOTAL** | **~920** | - | **~132 KB** |

**Conclusion:** L'utilisation reste largement sous la limite de 250MB.

### Bandwidth

| Opération | Requêtes/jour | Taille | Bandwidth/jour |
|-----------|---------------|--------|----------------|
| Rate limiting | 100,000 | 50 bytes | 5 MB |
| Cache reads | 50,000 | 500 bytes | 25 MB |
| Cache writes | 5,000 | 500 bytes | 2.5 MB |
| Security | 10,000 | 100 bytes | 1 MB |
| **TOTAL** | **165,000** | - | **~33.5 MB** |

**Conclusion:** ~1GB/mois << 10GB limite.

---

## 🚀 Configuration Production

### 1. Créer Upstash Redis

```bash
1. Aller sur https://console.upstash.com/redis
2. Créer une nouvelle database
3. Choisir la région la plus proche (eu-west-1 pour Europe)
4. Copier REST URL et TOKEN
```

### 2. Configuration .env

```env
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### 3. Installation

```bash
npm install
npx prisma generate
```

### 4. Test de connexion

```bash
npm run start:dev
```

Logs attendus:
```
✅ Upstash Redis connected
```

---

## ⚠️ Risques & Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Redis down | Faible | Faible | Fallback automatique vers DB |
| Rate limits Upstash | Faible | Moyen | Réduire TTL, cache moins agressif |
| Memory limit | Très faible | Moyen | Tous les objets <5KB, TTL courts |
| Data loss Redis | Faible | Nulle | Données temporaires uniquement |
| Token theft | Faible | Élevé | Tokens hashés, TTL courts (10min) |

---

## 📈 Monitoring

### Health Check

```typescript
// HealthController
@Get('health/redis')
async redisHealth() {
  const stats = await this.securityRedis.getStats();
  return {
    connected: stats.connected,
    activeLoginAttempts: stats.loginAttempts,
    blockedAccounts: stats.blockedAccounts,
    resetTokens: stats.resetTokens,
  };
}
```

### Logs

```typescript
// Log structure
[RedisService] Redis GET failed for cache:profile:abc: Connection timeout
[SecurityRedis] Account blocked: user_abc123
[RedisThrottler] IP blocked: 192_168_1_1 for 3600s
[CacheService] Object too large to cache (8500 bytes) - skipping
```

---

## 📝 Checklist Déploiement

- [ ] Variables d'environnement configurées
- [ ] Upstash Redis créé et connecté
- [ ] TTL vérifiés sur toutes les clés
- [ ] Fallback testé (stop Redis, vérifier app fonctionne)
- [ ] Rate limiting testé
- [ ] Cache invalidation testée
- [ ] Sécurité login testée
- [ ] Reset password testé
- [ ] Monitoring configuré

---

## 🎓 Bonnes Pratiques

1. **Jamais de données persistantes dans Redis**
   - Utiliser PostgreSQL pour tout ce qui doit survivre
   - Redis = cache + sécurité temporaire uniquement

2. **Toujours des TTL courts**
   - Rate limiting: 1-15 minutes
   - Cache: 30s - 2 minutes
   - Tokens: 10 minutes max

3. **Limiter la taille des objets**
   - Max 5KB par objet
   - Utiliser des versions "light" des objets

4. **Fail open**
   - Si Redis down, l'app continue
   - Logger l'erreur mais ne pas bloquer

5. **Nommer clairement les clés**
   - Format: `service:entity:id`
   - Ex: `auth:login:user123`, `cache:profile:user456`

---

## 🔗 Fichiers Créés

```
src/redis/
├── redis.module.ts              # Module Redis global
├── redis.service.ts             # Client Upstash avec fallback
├── redis-throttler.guard.ts     # Rate limiting optimisé
├── redis-throttler.decorator.ts # Décorateurs @Throttle
├── security-redis.service.ts    # Anti brute-force + tokens
├── cache.service.ts             # Cache léger profils/canaux
└── redis-health.indicator.ts    # Health check endpoint
```

---

## ✅ Résumé

| Aspect | Implémentation |
|--------|---------------|
| **Stockage** | Temporaire uniquement, TTL obligatoire |
| **Taille** | <5KB par objet, données light |
| **Sécurité** | Fallback DB si Redis down |
| **Rate Limit** | IP + userId, blocage progressif |
| **Cache** | Profils/canaux, TTL 30s-2min |
| **Tokens** | Reset password, TTL 10min |
| **Conso Upstash** | ~132KB memory, ~1GB bandwidth/mois |

**L'architecture est prête pour la production avec Upstash Free Tier !** 🚀
