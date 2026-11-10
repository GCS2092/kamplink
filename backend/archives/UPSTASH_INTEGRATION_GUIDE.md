# 🔴 Guide Intégration Upstash Redis - CampusLink

## Étape par Étape : De la Création à la Production

---

## ÉTAPE 1 : Créer votre Base Redis Upstash (5 minutes)

### 1.1 Aller sur Upstash

```
🔗 https://console.upstash.com/redis
```

### 1.2 Créer une nouvelle Database

1. Cliquer sur **"Create Database"**
2. **Nom** : `campuslink-redis`
3. **Region** : Choisir la plus proche de vos utilisateurs
   - Europe → `eu-west-1` (Ireland)
   - US East → `us-east-1`
   - US West → `us-west-2`
   - Asia → `ap-southeast-1`
4. **TLS** : ✅ Enabled (obligatoire pour la sécurité)
5. Cliquer **"Create"**

### 1.3 Récupérer les Credentials

Une fois créée, aller dans l'onglet **"REST API"** et copier :

```
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

⚠️ **Important** : Le token est confidentiel - ne jamais le commit !

---

## ÉTAPE 2 : Configuration Environment (2 minutes)

### 2.1 Créer le fichier .env

Dans `c:\CampusLink\backend\`:

```bash
# Copier le template
copy .env.example .env

# Ou créer manuellement
```

### 2.2 Remplir les variables Redis

```env
# .env
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 2.3 Vérifier les autres variables essentielles

```env
# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/campuslink

# Firebase (déjà configuré normalement)
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY=xxx
FIREBASE_CLIENT_EMAIL=xxx
```

---

## ÉTAPE 3 : Installation & Configuration (3 minutes)

### 3.1 Installer les dépendances

```bash
cd c:\CampusLink\backend

# Installer @upstash/redis
npm install @upstash/redis

# Vérifier l'installation
cat package.json | grep upstash
```

### 3.2 Vérifier les fichiers créés

S'assurer que ces fichiers existent dans `src/redis/`:

```
src/redis/
├── redis.module.ts              ✅
├── redis.service.ts             ✅
├── redis-throttler.guard.ts     ✅
├── redis-throttler.decorator.ts ✅
├── security-redis.service.ts    ✅
├── cache.service.ts             ✅
└── redis-health.indicator.ts  ✅
```

### 3.3 Vérifier AppModule

Dans `src/app.module.ts`:

```typescript
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    // ... autres modules
    RedisModule,        // ✅ Doit être présent
    // ...
  ],
})
export class AppModule {}
```

---

## ÉTAPE 4 : Tester la Connexion (2 minutes)

### 4.1 Démarrer le serveur

```bash
npm run start:dev
```

### 4.2 Vérifier les logs

**✅ Succès attendu :**
```
[Nest] 12345  - 2024/01/15 10:30:00     LOG ✅ Upstash Redis connected
[Nest] 12345  - 2024/01/15 10:30:00     LOG 🚀 CampusLink API démarrée sur http://localhost:3000
[Nest] 12345  - 2024/01/15 10:30:00     LOG 📚 Documentation Swagger: http://localhost:3000/api/docs
```

**❌ Erreur possible :**
```
[RedisService] Redis not configured - running without cache
```
→ Vérifier que `.env` est bien créé et les variables sont correctes

**❌ Erreur de connexion :**
```
[RedisService] Redis connection failed: Connection timeout
```
→ Vérifier l'URL et le token, vérifier la connexion internet

---

## ÉTAPE 5 : Vérifier le Fonctionnement (5 minutes)

### 5.1 Test Health Check

```bash
# Ouvrir un terminal et exécuter :
curl http://localhost:3000/api/v1/health

# Ou dans le navigateur :
# http://localhost:3000/api/v1/health
```

**Réponse attendue :**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### 5.2 Test Rate Limiting

```bash
# Exécuter 5 requêtes rapides
for ($i=1; $i -le 5; $i++) { 
  curl http://localhost:3000/api/v1/health 
}

# La 6ème doit être bloquée (429 Too Many Requests)
```

### 5.3 Test via Swagger UI

1. Ouvrir : http://localhost:3000/api/docs
2. Tester l'endpoint `/auth/login` avec des credentials invalides 3 fois
3. La 4ème tentative doit retourner : `"Compte bloqué pendant 900 secondes"`

---

## ÉTAPE 6 : Intégrer dans les Services (Exemples)

### 6.1 Dans AuthController (Rate Limiting)

```typescript
// src/auth/auth.controller.ts
import { ThrottleAuth } from '../redis/redis-throttler.decorator';

@Controller('auth')
export class AuthController {
  
  @Post('login')
  @ThrottleAuth()  // ✅ Limite : 5 tentatives / 15 min
  async login(@Body() dto: LoginDto) {
    // ...
  }
  
  @Post('forgot-password')
  @ThrottleAuth()  // ✅ Même limitation
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    // ...
  }
}
```

### 6.2 Dans AuthService (Anti Brute Force)

```typescript
// src/auth/auth.service.ts
import { SecurityRedisService } from '../redis/security-redis.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private firebase: FirebaseService,
    private securityRedis: SecurityRedisService,  // ✅ Injecter
  ) {}

  async login(idToken: string, identifier: string) {
    // 1. Vérifier si compte bloqué
    const { blocked, remainingSeconds } = await this.securityRedis.isLoginBlocked(identifier);
    if (blocked) {
      throw new UnauthorizedException(`Compte temporairement bloqué. Réessayez dans ${remainingSeconds} secondes.`);
    }

    try {
      // 2. Vérifier token Firebase
      const decoded = await this.firebase.verifyToken(idToken);
      
      // 3. Login réussi → reset des tentatives
      await this.securityRedis.clearLoginAttempts(identifier);
      
      return { user: decoded };
      
    } catch (error) {
      // 4. Login échoué → enregistrer la tentative
      const remaining = await this.securityRedis.recordFailedLogin(identifier);
      
      if (remaining === null) {
        throw new UnauthorizedException('Trop de tentatives échouées. Compte bloqué pendant 15 minutes.');
      }
      
      throw new UnauthorizedException(`Login échoué. Il vous reste ${remaining} tentatives.`);
    }
  }
  
  async forgotPassword(email: string) {
    // 1. Trouver l'utilisateur
    const user = await this.prisma.utilisateur.findUnique({ where: { email } });
    if (!user) return; // Ne pas révéler si l'email existe
    
    // 2. Créer token dans Redis (TTL 10min)
    const token = await this.securityRedis.createResetToken(user.id);
    if (!token) {
      throw new Error('Impossible de créer le token. Veuillez réessayer plus tard.');
    }
    
    // 3. Envoyer l'email avec le token
    await this.sendResetEmail(email, token);
    
    return { message: 'Email de réinitialisation envoyé' };
  }
  
  async resetPassword(token: string, newPassword: string) {
    // 1. Valider le token depuis Redis
    const userId = await this.securityRedis.validateResetToken(token);
    if (!userId) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
    
    // 2. Mettre à jour le mot de passe
    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    
    // 3. Invalider le token
    await this.securityRedis.invalidateResetToken(token);
    
    return { message: 'Mot de passe réinitialisé avec succès' };
  }
}
```

### 6.3 Dans UsersService (Cache)

```typescript
// src/users/users.service.ts
import { CacheService } from '../redis/cache.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,  // ✅ Injecter
  ) {}

  async getProfile(userId: string) {
    // 1. Essayer le cache d'abord (TTL 60s)
    let profile = await this.cache.getCachedProfile(userId);
    
    if (!profile) {
      // 2. Charger depuis la base
      profile = await this.prisma.profil.findUnique({
        where: { utilisateurId: userId },
        select: {
          id: true,
          prenom: true,
          nom: true,
          avatarUrl: true,
          statutVerification: true,
          scoreReputation: true,
          // Pas de données volumineuses
        },
      });
      
      if (profile) {
        // 3. Mettre en cache pour les prochaines requêtes
        await this.cache.cacheProfile(userId, profile);
      }
    }
    
    return profile;
  }
  
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // 1. Mettre à jour en base
    const updated = await this.prisma.profil.update({
      where: { utilisateurId: userId },
      data: dto,
    });
    
    // 2. Invalider le cache (force refresh)
    await this.cache.invalidateProfile(userId);
    
    return updated;
  }
}
```

---

## ÉTAPE 7 : Variables d'Environnement Complètes

### .env complet pour le développement

```env
# ============================================================
# CampusLink - Configuration Développement
# ============================================================

# ─── Application ───
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# ─── Database (Supabase/Neon/Railway) ───
DATABASE_URL=postgresql://user:password@host:5432/campuslink?schema=public

# ─── REDIS UPSTASH (Obligatoire pour Production) ───
# Remplacer par vos credentials depuis https://console.upstash.com
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# ─── FIREBASE ───
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...

# ─── SENTRY (Optionnel) ───
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz

# ─── ELASTICSEARCH (Optionnel) ───
ELASTICSEARCH_URL=http://localhost:9200

# ─── Rate Limiting (Redis) ───
# Global API
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Auth endpoints (strict)
AUTH_RATE_LIMIT_TTL=900
AUTH_RATE_LIMIT_MAX=5

# ─── Cache TTL (en secondes) ───
CACHE_PROFILE_TTL=60      # 1 minute
CACHE_CANAL_TTL=120       # 2 minutes
CACHE_ESPACE_TTL=120      # 2 minutes

# ─── Sécurité ───
RESET_TOKEN_TTL=600       # 10 minutes
LOGIN_BLOCK_DURATION=900  # 15 minutes
MAX_LOGIN_ATTEMPTS=3
```

---

## ÉTAPE 8 : Déploiement Production (Vercel/Railway/Render)

### 8.1 Vercel

1. Aller sur https://vercel.com
2. Importer le repo GitHub
3. Dans **"Environment Variables"**, ajouter :

```
UPSTASH_REDIS_REST_URL    = https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN  = AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NODE_ENV                  = production
DATABASE_URL              = postgresql://...
# ... autres variables
```

4. Deploy 🚀

### 8.2 Railway

1. Aller sur https://railway.app
2. New Project → Deploy from GitHub repo
3. Dans **Variables** :

```bash
# CLI Railway
railway variables set UPSTASH_REDIS_REST_URL="https://..."
railway variables set UPSTASH_REDIS_REST_TOKEN="AXXX..."
```

4. Deploy 🚀

### 8.3 Render

1. Aller sur https://render.com
2. New Web Service → Connecter GitHub
3. Dans **Environment** :

```
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

4. Create Web Service 🚀

---

## ÉTAPE 9 : Monitoring & Debugging

### 9.1 Logs Redis

```bash
# En développement
npm run start:dev

# Filtrer les logs Redis
npm run start:dev 2>&1 | grep -i redis
```

### 9.2 Stats Redis

```typescript
// Dans un controller admin
@Get('admin/redis-stats')
async getRedisStats() {
  const securityStats = await this.securityRedis.getStats();
  const cacheStats = await this.cache.getCacheStats();
  
  return {
    connected: securityStats.connected,
    security: {
      loginAttempts: securityStats.loginAttempts,
      blockedAccounts: securityStats.blockedAccounts,
      resetTokens: securityStats.resetTokens,
    },
    cache: {
      profiles: cacheStats.profiles,
      canals: cacheStats.canals,
      espaces: cacheStats.espaces,
      counts: cacheStats.counts,
    },
  };
}
```

### 9.3 Dashboard Upstash

```
https://console.upstash.com/redis/your-instance-id
```

Moniteur :
- **Memory Usage** (doit rester < 250MB)
- **Bandwidth** (doit rester < 10GB/mois)
- **Operations/sec**
- **Connections**

---

## 🔧 Troubleshooting

### Problème : "Redis not configured"

**Cause** : Variables d'environnement manquantes

**Solution** :
```bash
# Vérifier que .env existe
ls -la .env

# Vérifier le contenu
cat .env | grep UPSTASH

# Relancer le serveur
npm run start:dev
```

### Problème : "Connection timeout"

**Cause** : Mauvaise URL ou problème réseau

**Solution** :
```bash
# Tester la connexion
curl https://your-instance.upstash.io/ping \
  -H "Authorization: Bearer AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Vérifier le token (doit commencer par AY pour REST API)
echo "AY..."
```

### Problème : "Cannot find module '@upstash/redis'"

**Solution** :
```bash
npm install @upstash/redis
# ou
npm ci  # réinstaller tout
```

---

## ✅ Checklist Finale

- [ ] Compte Upstash créé
- [ ] Database Redis créée
- [ ] URL et Token copiés dans .env
- [ ] npm install exécuté
- [ ] Serveur démarré sans erreurs
- [ ] Message "✅ Upstash Redis connected" visible
- [ ] Health check (/health) retourne redis: up
- [ ] Rate limiting testé (6ème requête bloquée)
- [ ] Login attempts testé (3 échecs → blocage)
- [ ] Cache testé (profile mis en cache)
- [ ] Variables configurées sur la plateforme de prod
- [ ] Déploiement réussi

---

## 📞 Support

- **Documentation Upstash** : https://docs.upstash.com/redis
- **Support Upstash** : support@upstash.com
- **Dashboard** : https://console.upstash.com

---

**Votre backend CampusLink est maintenant prêt avec Redis Upstash !** 🚀
