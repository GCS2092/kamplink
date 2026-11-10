# CampusLink Backend API

## 📚 Documentation de l'API

### URL de base
```
http://localhost:3000/api/v1
```

### Documentation Swagger
```
http://localhost:3000/api/docs
```

### Health Check
```
GET /api/v1/health
```

---

## 🔐 Authentification

L'API utilise Firebase Authentication avec OTP SMS.

### Header requis pour les routes protégées
```
Authorization: Bearer <firebase_id_token>
```

### Flow d'authentification
1. Le mobile vérifie l'OTP avec Firebase côté client
2. Le mobile reçoit un `idToken` Firebase
3. Le mobile appelle `POST /auth/login` avec l'`idToken`
4. Le backend crée/récupère l'utilisateur et retourne les infos
5. Le mobile utilise l'`idToken` pour les requêtes suivantes

---

## 📋 Endpoints par Module

### 🔑 Auth
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/auth/login` | Login avec Firebase token | ❌ |
| POST | `/auth/profile` | Créer profil académique | ✅ |

### 👤 Users
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/users/universites` | Liste des universités | ❌ |
| GET | `/users/universites/:id/filieres` | Filières d'une université | ❌ |
| GET | `/users/:id/public` | Profil public d'un utilisateur | ❌ |
| GET | `/users/me` | Mon profil complet | ✅ |
| POST | `/users/me/profile` | Créer mon profil | ✅ |
| PATCH | `/users/me/profile` | Modifier mon profil | ✅ |
| POST | `/users/me/verification` | Soumettre vérification | ✅ |
| GET | `/users/me/verification` | Statut de vérification | ✅ |
| GET | `/users/admin/verifications` | Liste vérifications en attente | ✅👮 |
| PATCH | `/users/admin/verifications/:id/approve` | Approuver vérification | ✅👮 |
| PATCH | `/users/admin/verifications/:id/reject` | Rejeter vérification | ✅👮 |
| PATCH | `/users/admin/:id/ban` | Bannir utilisateur | ✅👮 |
| PATCH | `/users/admin/:id/unban` | Débannir utilisateur | ✅👮 |

*👮 = Rôle admin/superadmin requis*

### 🏢 Espaces
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/espaces` | Liste des espaces publics | ❌ |
| GET | `/espaces/:id` | Détails d'un espace | ❌ |
| GET | `/espaces/me/list` | Mes espaces | ✅ |
| POST | `/espaces/:id/join` | Rejoindre un espace | ✅ |
| POST | `/espaces/:id/leave` | Quitter un espace | ✅ |
| POST | `/espaces` | Créer un espace | ✅👮 |
| PATCH | `/espaces/:id` | Modifier un espace | ✅👮 |
| DELETE | `/espaces/:id` | Supprimer un espace | ✅👮 |
| GET | `/espaces/:id/membres` | Liste des membres | ✅👮 |

### 📺 Canaux
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/canaux/espace/:id` | Canaux d'un espace | ❌ |
| GET | `/canaux/:id` | Détails d'un canal | ❌ |
| POST | `/canaux/:id/join` | Rejoindre un canal | ✅ |
| POST | `/canaux/:id/leave` | Quitter un canal | ✅ |
| POST | `/canaux` | Créer un canal | ✅👮 |
| PATCH | `/canaux/:id` | Modifier un canal | ✅👮 |
| DELETE | `/canaux/:id` | Supprimer un canal | ✅👮 |
| GET | `/canaux/:id/membres` | Liste des membres | ✅👮 |

### 💬 Messages
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/messages/canal/:id` | Messages d'un canal (paginés) | ❌ |
| GET | `/messages/:id` | Détails d'un message | ❌ |
| GET | `/messages/:id/reponses` | Réponses à un message | ❌ |
| GET | `/messages/canal/:id/search?q=...` | Recherche dans un canal | ❌ |
| POST | `/messages` | Créer un message | ✅ |
| PATCH | `/messages/:id` | Modifier mon message | ✅ |
| DELETE | `/messages/:id` | Supprimer mon message | ✅ |
| POST | `/messages/:id/vote` | Voter sur un message | ✅ |
| POST | `/messages/:id/epingle` | Épingler/désépingler | ✅👮 |

### 📄 Documents
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/documents/canal/:id` | Documents d'un canal | ❌ |
| GET | `/documents/:id` | Détails d'un document | ❌ |
| GET | `/documents/user/me` | Mes documents | ✅ |
| GET | `/documents/search/global?q=...` | Recherche globale | ❌ |
| POST | `/documents` | Upload un document | ✅ |
| PATCH | `/documents/:id` | Modifier mon document | ✅ |
| DELETE | `/documents/:id` | Supprimer mon document | ✅ |
| POST | `/documents/:id/hide` | Masquer (modération) | ✅👮 |
| POST | `/documents/:id/unhide` | Démasquer | ✅👮 |

### 💼 Opportunités
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/opportunites` | Liste des opportunités | ❌ |
| GET | `/opportunites/:id` | Détails d'une opportunité | ❌ |
| GET | `/opportunites/search/global?q=...` | Recherche | ❌ |
| GET | `/opportunites/me/list` | Mes opportunités | ✅ |
| POST | `/opportunites` | Créer une opportunité | ✅ |
| PATCH | `/opportunites/:id` | Modifier mon opportunité | ✅ |
| DELETE | `/opportunites/:id` | Supprimer mon opportunité | ✅ |
| POST | `/opportunites/:id/approve` | Approuver | ✅👮 |
| POST | `/opportunites/:id/reject` | Rejeter | ✅👮 |
| POST | `/opportunites/:id/expire` | Marquer expirée | ✅👮 |

### 🔔 Notifications
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/notifications` | Mes notifications | ✅ |
| GET | `/notifications/unread-count` | Nombre non lues | ✅ |
| POST | `/notifications/:id/read` | Marquer comme lue | ✅ |
| POST | `/notifications/read-all` | Tout marquer lu | ✅ |
| DELETE | `/notifications/:id` | Supprimer une notification | ✅ |
| DELETE | `/notifications` | Supprimer toutes | ✅ |

### 🚨 Signalements (Modération)
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/signalements` | Créer un signalement | ✅ |
| GET | `/signalements/me` | Mes signalements | ✅ |
| GET | `/signalements` | Liste (admin) | ✅👮 |
| GET | `/signalements/stats` | Statistiques | ✅👮 |
| GET | `/signalements/:id` | Détails | ✅👮 |
| PATCH | `/signalements/:id` | Mise à jour statut | ✅👮 |

---

## 🏷️ Tags Swagger

- **Auth** - Authentification Firebase
- **Users** - Gestion des utilisateurs et profils
- **Espaces** - Espaces communautaires
- **Canaux** - Canaux de discussion
- **Messages** - Messages et discussions
- **Documents** - Partage de documents
- **Opportunites** - Opportunités professionnelles
- **Notifications** - Notifications utilisateur
- **Signalements** - Système de modération

---

## 📦 Structure des DTOs

### Types communs
```typescript
// Niveau d'études
type Niveau = 'L1' | 'L2' | 'L3' | 'M1' | 'M2'

// Rôles
type Role = 'student' | 'delegate' | 'admin' | 'superadmin'

// Statut de vérification
type StatutVerification = 'pending' | 'verified' | 'rejected'

// Types de message
type TypeMessage = 'annonce' | 'question' | 'ressource' | 'discussion'

// Types d'opportunité
type TypeOffre = 'stage' | 'emploi' | 'bourse' | 'concours' | 'evenement'
```

---

## 🔒 Sécurité

- **Helmet** - Headers de sécurité HTTP
- **CORS** - Configuré pour le frontend
- **Rate Limiting** - 100 requêtes/minute par IP
- **Validation** - Class-validator sur tous les DTOs
- **RBAC** - Contrôle d'accès basé sur les rôles
- **Soft Delete** - Suppression logique des données

---

## 📄 Pagination

Les endpoints de liste supportent la pagination via query params:
```
?page=1&limit=20
```

Format de réponse paginée:
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## ⚠️ Gestion des erreurs

Format standard d'erreur:
```json
{
  "statusCode": 400,
  "message": "Description de l'erreur",
  "error": "Bad Request"
}
```

Codes HTTP courants:
- `200` - Succès
- `201` - Créé
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Non autorisé (permissions)
- `404` - Ressource introuvable
- `409` - Conflit (ex: profil déjà existant)
- `429` - Trop de requêtes (rate limiting)
- `500` - Erreur serveur
