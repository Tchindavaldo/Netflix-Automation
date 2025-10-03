# API Routes Documentation

## 📋 Table des matières

- [Routes de Session](#routes-de-session)
- [Routes des Cookies](#routes-des-cookies)
- [Routes des Pages/Snapshots](#routes-des-pagessnapshots)
- [Route d'interaction (goToPlan)](#route-dinteraction-gotoplan)
- [Exemples d'utilisation](#exemples-dutilisation)

---

## 🔐 Routes de Session

### Démarrer une session
**POST** `/api/netflix/session/start`

Démarre une nouvelle session Netflix avec un navigateur Firefox.

**Réponse:**
```json
{
  "success": true,
  "sessionId": "abc123...",
  "message": "Session démarrée avec succès"
}
```

### Obtenir le statut d'une session
**GET** `/api/netflix/session/status?sessionId=abc123`

Récupère les informations sur une session active.

**Paramètres:**
- `sessionId` (query ou header `x-session-id`) - ID de la session

**Réponse:**
```json
{
  "success": true,
  "sessionId": "abc123...",
  "status": {
    "isActive": true,
    "hasDriver": true,
    "hasCookies": true,
    "cookieCount": 7,
    "lastCookieUpdate": "2024-01-15T10:30:00.000Z",
    "monitoringActive": true,
    "keepAliveActive": true
  }
}
```

### Fermer une session
**POST** `/api/netflix/session/close`

Ferme une session active et libère les ressources.

**Body:**
```json
{
  "sessionId": "abc123..."
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Session fermée avec succès"
}
```

---

## 🍪 Routes des Cookies

### Récupérer les cookies
**GET** `/api/netflix/cookies?sessionId=abc123`

Récupère les cookies actuels de la session Netflix.

**Paramètres:**
- `sessionId` (query ou header `x-session-id`) - ID de la session

**Réponse:**
```json
{
  "success": true,
  "sessionId": "abc123...",
  "active": true,
  "cookies": {
    "cookieString": "NetflixId=xxx; SecureNetflixId=yyy; nfvdid=zzz; ...",
    "individual": {
      "NetflixId": "xxx",
      "SecureNetflixId": "yyy",
      "nfvdid": "zzz",
      "flwssn": "aaa",
      "gsid": "bbb"
    },
    "raw": [...],
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  },
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

### Mettre à jour les cookies
**POST** `/api/netflix/cookies/update?sessionId=abc123`

Force la mise à jour des cookies depuis le navigateur.

**Paramètres:**
- `sessionId` (query ou header `x-session-id`) - ID de la session

**Réponse:**
```json
{
  "success": true,
  "sessionId": "abc123...",
  "cookies": {
    "cookieString": "...",
    "individual": {...},
    "raw": [...],
    "lastUpdated": "2024-01-15T10:35:00.000Z"
  },
  "count": 7,
  "message": "Cookies mis à jour avec succès"
}
```

---

## 📸 Routes des Pages/Snapshots

### Sauvegarder un snapshot complet
**POST** `/api/netflix/page/snapshot?sessionId=abc123`

Sauvegarde un snapshot complet de la page actuelle (HTML + screenshot + métadonnées).

**Paramètres:**
- `sessionId` (query ou header `x-session-id`) - ID de la session

**Body (optionnel):**
```json
{
  "prefix": "mon_snapshot",
  "directory": "/chemin/personnalise"
}
```

**Réponse:**
```json
{
  "success": true,
  "sessionId": "abc123...",
  "files": {
    "html": "/chemin/vers/snapshot_1234567890.html",
    "screenshot": "/chemin/vers/snapshot_1234567890.png",
    "metadata": "/chemin/vers/snapshot_1234567890.json"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "sessionId": "abc123...",
    "url": "https://www.netflix.com/signup",
    "title": "Netflix",
    "readyState": "complete",
    "userAgent": "Mozilla/5.0 ...",
    "htmlLength": 123456,
    "files": {
      "html": "snapshot_1234567890.html",
      "screenshot": "snapshot_1234567890.png"
    }
  },
  "message": "Snapshot sauvegardé avec succès"
}
```

---

## 🎯 Route d'interaction (goToPlan)

### Cliquer sur un bouton pour naviguer
**POST** `/api/netflix/page/goToPlan`

Clique sur un bouton spécifique (via sélecteur CSS) sur la page actuelle.

**Paramètres:**
- `sessionId` (query ou header `x-session-id`) - ID de la session
- `buttonSelector` (body JSON ou query) - Sélecteur CSS du bouton (OBLIGATOIRE)

**Body:**
```json
{
  "buttonSelector": "button[data-uia='next-button']"
}
```

**Réponse:**
```json
{
  "success": true,
  "sessionId": "abc123...",
  "buttonSelector": "button[data-uia='next-button']",
  "navigation": {
    "before": "https://www.netflix.com/signup",
    "after": "https://www.netflix.com/signup/planform",
    "changed": true
  },
  "title": "Netflix - Choose your plan",
  "message": "Clic effectué avec succès"
}
```

**Exemples de sélecteurs courants:**
- `button[data-uia="next-button"]` - Bouton "Next" initial
- `button[data-uia="continue-button"]` - Bouton "Continue"
- `button[data-uia="action-continue"]` - Continuer vers inscription
- `button.nf-btn-primary` - Bouton primaire Netflix
- `button[type="submit"]` - Bouton de soumission

---

## 💡 Exemples d'utilisation

### Exemple 1: Démarrer une session et récupérer les cookies

```bash
# 1. Démarrer une session
curl -X POST http://localhost:3000/api/netflix/session/start

# Réponse: { "success": true, "sessionId": "abc123..." }

# 2. Récupérer les cookies
curl -X GET "http://localhost:3000/api/netflix/cookies?sessionId=abc123"

# 3. Fermer la session
curl -X POST http://localhost:3000/api/netflix/session/close \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123"}'
```

### Exemple 2: Créer un snapshot de la page actuelle

```bash
# 1. Démarrer une session
SESSION_ID=$(curl -s -X POST http://localhost:3000/api/netflix/session/start | jq -r '.sessionId')

# 2. Attendre que la page charge (quelques secondes)
sleep 5

# 3. Sauvegarder un snapshot
curl -X POST "http://localhost:3000/api/netflix/page/snapshot?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "prefix": "netflix_signup",
    "directory": "./mes_snapshots"
  }'
```

### Exemple 3: Utiliser l'en-tête x-session-id

```bash
# Démarrer une session
SESSION_ID=$(curl -s -X POST http://localhost:3000/api/netflix/session/start | jq -r '.sessionId')

# Utiliser l'en-tête au lieu du query parameter
curl -X GET http://localhost:3000/api/netflix/cookies \
  -H "x-session-id: $SESSION_ID"

# Mettre à jour les cookies
curl -X POST http://localhost:3000/api/netflix/cookies/update \
  -H "x-session-id: $SESSION_ID"

# Sauvegarder un snapshot
curl -X POST http://localhost:3000/api/netflix/page/snapshot \
  -H "x-session-id: $SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"prefix": "snapshot"}'
```

### Exemple 4: Vérifier le statut d'une session

```bash
# Vérifier si la session est toujours active
curl -X GET "http://localhost:3000/api/netflix/session/status?sessionId=$SESSION_ID"
```

### Exemple 5: Cliquer sur un bouton pour naviguer

```bash
# Démarrer une session
SESSION_ID=$(curl -s -X POST http://localhost:3000/api/netflix/session/start | jq -r '.sessionId')

# Attendre que la page charge
sleep 3

# Cliquer sur le bouton "Next"
curl -X POST http://localhost:3000/api/netflix/page/goToPlan \
  -H "x-session-id: $SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "buttonSelector": "button[data-uia=\"next-button\"]"
  }'
```

---

## 📝 Notes importantes

1. **ID de session**: Peut être passé soit via query parameter `?sessionId=xxx`, soit via l'en-tête HTTP `x-session-id`.

2. **Snapshots**: Par défaut, les snapshots sont sauvegardés dans le dossier `snapshots/` à la racine du projet.

3. **Cookies**: Les cookies sont automatiquement mis à jour toutes les 30 secondes pendant que la session est active.

4. **Keep-alive**: La session reste active grâce à un mécanisme de keep-alive qui s'exécute toutes les 5 minutes.

5. **Monitoring**: La surveillance des cookies et le keep-alive sont automatiquement activés lors du démarrage d'une session.

6. **Interaction**: L'endpoint `goToPlan` attend jusqu'à 10 secondes pour trouver le bouton et 5 secondes pour qu'il soit cliquable.

---

## 🔧 Variables d'environnement

- `HEADLESS` - Exécuter le navigateur en mode headless (true/false, défaut: true)
- `NETFLIX_UA` - User-Agent personnalisé pour Firefox
- `NODE_ENV` - Environnement d'exécution (development/production)