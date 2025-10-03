# 🎯 Endpoint: Go To Plan

## 📍 Endpoint
```
POST /api/netflix/page/goToPlan
```

## 📝 Description
Cet endpoint permet de cliquer sur un bouton spécifique sur la page actuelle en utilisant un sélecteur CSS. Il est conçu pour naviguer automatiquement vers les différentes étapes du processus Netflix (ex: passer de la page d'accueil à la page de sélection de plan).

---

## 📥 Paramètres

### 1. **sessionId** (Obligatoire)
ID de la session Netflix active.

**Peut être passé via:**
- Query parameter: `?sessionId=sess_xxx`
- Header HTTP: `x-session-id: sess_xxx`

### 2. **buttonSelector** (Obligatoire)
Sélecteur CSS du bouton sur lequel cliquer.

**Peut être passé via:**
- Body JSON: `{ "buttonSelector": "..." }`
- Query parameter: `?buttonSelector=...`

**Exemples de sélecteurs:**
```css
button[data-uia="next-button"]
button.nf-btn-primary
#submit-button
.continue-btn
button[type="submit"]
```

---

## 💡 Exemples de requêtes

### Exemple 1: Requête minimale avec query parameters
```bash
curl -X POST "http://localhost:3000/api/netflix/page/goToPlan?sessionId=sess_123&buttonSelector=button[data-uia='next-button']"
```

### Exemple 2: Avec l'en-tête x-session-id et body JSON
```bash
curl -X POST http://localhost:3000/api/netflix/page/goToPlan \
  -H "x-session-id: sess_1234567890_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "buttonSelector": "button[data-uia=\"continue-button\"]"
  }'
```

### Exemple 3: Cliquer sur un bouton "Next"
```bash
curl -X POST http://localhost:3000/api/netflix/page/goToPlan \
  -H "x-session-id: sess_1234567890_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "buttonSelector": "button.nf-btn-primary"
  }'
```

### Exemple 4: Cliquer sur un bouton de soumission
```bash
curl -X POST http://localhost:3000/api/netflix/page/goToPlan \
  -H "x-session-id: sess_1234567890_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "buttonSelector": "button[type=\"submit\"]"
  }'
```

---

## 📤 Réponses

### ✅ Succès (200)
```json
{
  "success": true,
  "sessionId": "sess_1234567890_abc123",
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

### ❌ Erreur - Session manquante (400)
```json
{
  "success": false,
  "message": "ID de session requis. Démarrez d'abord une session avec /api/netflix/session/start"
}
```

### ❌ Erreur - buttonSelector manquant (400)
```json
{
  "success": false,
  "message": "Le paramètre 'buttonSelector' est obligatoire"
}
```

### ❌ Erreur - Session inexistante (404)
```json
{
  "success": false,
  "message": "Session non trouvée ou expirée"
}
```

### ❌ Erreur - Bouton non trouvé (404)
```json
{
  "success": false,
  "message": "Bouton non trouvé avec le sélecteur: button[data-uia='wrong-selector']",
  "debug": {
    "currentUrl": "https://www.netflix.com/signup",
    "selector": "button[data-uia='wrong-selector']",
    "pageSourceLength": 123456
  }
}
```

### ❌ Erreur serveur (500)
```json
{
  "success": false,
  "message": "Erreur lors du clic sur le bouton",
  "error": "Error: element not interactable"
}
```

---

## 🔧 Workflow complet

### Scénario: Naviguer de /signup vers /planform

```bash
#!/bin/bash

# 1. Démarrer une session Netflix
SESSION_ID=$(curl -s -X POST http://localhost:3000/api/netflix/session/start | jq -r '.sessionId')
echo "✅ Session créée: $SESSION_ID"

# 2. Attendre que la page charge
sleep 3

# 3. Cliquer sur le bouton "Next" pour aller vers planform
curl -X POST http://localhost:3000/api/netflix/page/goToPlan \
  -H "x-session-id: $SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "buttonSelector": "button[data-uia=\"next-button\"]"
  }' | jq '.'

# 4. Vérifier la nouvelle URL
sleep 2
curl -s -X GET "http://localhost:3000/api/netflix/session/status?sessionId=$SESSION_ID" | jq '.status'

# 5. Fermer la session
curl -X POST http://localhost:3000/api/netflix/session/close \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\"}"
```

---

## 🎯 Sélecteurs courants Netflix

Voici quelques sélecteurs CSS courants pour les boutons Netflix:

| Page | Sélecteur | Description |
|------|-----------|-------------|
| `/signup` | `button[data-uia="next-button"]` | Bouton "Next" initial |
| `/signup` | `button[data-uia="continue-button"]` | Bouton "Continue" |
| `/signup/planform` | `button[data-uia="action-continue"]` | Continuer vers inscription |
| `/signup/regform` | `button[data-uia="btn-continue"]` | Soumettre l'inscription |
| `/signup/creditoption` | `button[data-uia="action-submit-payment"]` | Soumettre paiement |
| Général | `button.nf-btn-primary` | Bouton primaire Netflix |
| Général | `button[type="submit"]` | N'importe quel bouton de soumission |

---

## 🧪 Test de sélecteurs

### Méthode 1: Dans le navigateur (DevTools)
```javascript
// Ouvrir les DevTools (F12) et tester dans la console
document.querySelector('button[data-uia="next-button"]')
```

### Méthode 2: Via l'endpoint de snapshot
```bash
# 1. Prendre un snapshot de la page actuelle
curl -X POST "http://localhost:3000/api/netflix/page/snapshot?sessionId=$SESSION_ID"

# 2. Ouvrir le fichier HTML généré et chercher les boutons
# 3. Extraire le bon sélecteur CSS
```

---

## 📝 Résumé

| Paramètre | Type | Requis | Où le passer | Description |
|-----------|------|--------|--------------|-------------|
| `sessionId` | string | ✅ Oui | Query ou Header | ID de la session Netflix |
| `buttonSelector` | string | ✅ Oui | Body JSON ou Query | Sélecteur CSS du bouton |

**Points importants:**
- ⏱️ Le handler attend jusqu'à 10 secondes pour trouver le bouton
- ⏱️ Le handler attend jusqu'à 5 secondes que le bouton soit cliquable
- 🔄 Après le clic, une pause de 2 secondes permet à la navigation de se produire
- 🎯 La réponse indique si l'URL a changé après le clic
- 🐛 En cas d'erreur, des informations de debug sont fournies
