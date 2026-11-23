# Documentation : Backend Regions

## 📋 Vue d'ensemble

Le système d'automatisation Netflix supporte maintenant plusieurs régions backend avec des plans différents selon la région géographique.

## 🌍 Régions supportées

### 1. **Region: `basic`** (Afrique du Sud / Par défaut)
Plans disponibles :
- `mobile` - ZAR 59 (ID: 4120)
- `basic` - ZAR 99 (ID: 4001)
- `standard` - ZAR 179 (ID: 3088)
- `premium` - ZAR 299 (ID: 3108)

### 2. **Region: `usa`** (États-Unis)
Plans disponibles :
- `standardWithAds` - $7.99 (ID: 5200)
- `standard` - $17.99 (ID: 3088)
- `premium` - $24.99 (ID: 3108)

⚠️ **Note importante** : Les plans `mobile` et `basic` ne sont **PAS disponibles** dans la région USA.

## 🔄 Workflow d'abonnement

### Flux normal (avec sélection de plan)

```
1. Démarrage session
2. Navigation vers sélection du plan
3. Sélection du plan ✅ (si le plan existe dans la région)
4. Clic après sélection
5. Navigation vers email/password
6. Remplissage email/password
7. Navigation vers paiement
8. Sélection méthode de paiement
9. Remplissage formulaire de paiement
10. Soumission du paiement
```

### Flux spécial USA (sans sélection de plan pour mobile/basic)

Si vous tentez d'utiliser `mobile` ou `basic` avec la région `usa`, l'étape 3 sera **automatiquement ignorée** :

```
1. Démarrage session
2. Navigation vers sélection du plan
3. ⏭️ IGNORÉ (plan non disponible dans cette région)
4. Clic après sélection
5. Navigation vers email/password
...
```

## 📡 API Request Format

### Requête frontend initiale

```json
POST /api/payment/init
{
  "userId": "user123",
  "numeroOM": "+237600000000",
  "email": "user@example.com",
  "motDePasse": "password123",
  "typeDePlan": "standard",
  "backendRegion": "usa",  // ← NOUVEAU PARAMÈTRE (optionnel, défaut: "basic")
  "amount": 17.99
}
```

### Requête vers l'orchestrateur

```json
POST /api/subscription/init
{
  "typeDePlan": "standard",
  "email": "user@example.com",
  "motDePasse": "password123",
  "planActivationId": "plan_abc123",
  "userId": "user123",
  "backendRegion": "usa",  // ← Transmis à l'orchestrateur
  "useOrchestration": true // ← NOUVEAU PARAMÈTRE (optionnel, défaut: false)
}
```

### Paramètres de la Requête

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `typeDePlan` | String | Oui | Type de plan (ex: 'mobile', 'standard') |
| `email` | String | Oui | Email du compte Netflix |
| `motDePasse` | String | Oui | Mot de passe du compte |
| `planActivationId` | String | Oui | ID unique de l'activation |
| `userId` | String | Oui | ID de l'utilisateur |
| `backendRegion` | String | Non | Région backend ('basic' par défaut) |
| `useOrchestration` | Boolean | Non | Activer l'automatisation (False par défaut) |

### Comportement de `useOrchestration`

- **`false` (Défaut)** : L'automatisation est désactivée. La demande est enregistrée avec le statut `pending` et nécessite un traitement manuel.
- **`true`** : L'automatisation est lancée (Selenium).

### Exemple de Requête

```json
{
  "typeDePlan": "mobile",
  "email": "user@example.com",
  "motDePasse": "password123",
  "planActivationId": "act_123456",
  "userId": "user_789",
  "backendRegion": "basic",
  "useOrchestration": false
}
```

## 🛠️ Configuration des sélecteurs

Fichier : `/selectors/subscription-selectors.json`

```json
{
  "planSelection": {
    "backendRegions": {
      "basic": {
        "mobile": {
          "selector": "label[for=\"select-4120\"]",
          "planId": "4120",
          "price": "ZAR 59"
        },
        "standard": {
          "selector": "label[for=\"select-3088\"]",
          "planId": "3088",
          "price": "ZAR 179"
        }
        // ... autres plans
      },
      "usa": {
        "standardWithAds": {
          "selector": "label[for=\"select-5200\"]",
          "planId": "5200",
          "price": "$7.99"
        }
        // ... autres plans USA
      }
    }
  }
}
```

## ✅ Validation des plans

Le système valide automatiquement que le `typeDePlan` demandé existe dans la `backendRegion` spécifiée.

### Exemples de validation

#### ✅ Valide
```javascript
{ typeDePlan: "standard", backendRegion: "usa" }
// OK : standard existe dans USA
```

#### ❌ Invalide
```javascript
{ typeDePlan: "mobile", backendRegion: "usa" }
// ERREUR : mobile n'existe pas dans USA
// → L'étape 3 sera ignorée automatiquement
```

## 🔍 Logs et débogage

Lors de l'exécution, vous verrez des logs comme :

```
🚀 Démarrage du processus d'abonnement Netflix
👤 UserId: user123
🏷️ PlanActivationId: plan_abc123
📦 Plan sélectionné: mobile
🌍 Région backend: usa
📧 Email: user@example.com

⏭️ Étape 3 ignorée: Le plan mobile n'existe pas dans la région usa
```

## 📊 Structure de données

### PlanActivation (Base de données)

```javascript
{
  userId: "user123",
  planNetflix: "standard",
  amount: 17.99,
  backendRegion: "usa",  // ← Nouveau champ
  statut: "pending",
  reqteStatusSuccess: "pending",
  // ... autres champs
}
```

## 🚀 Migration depuis l'ancienne version

### Avant (sans régions)
```javascript
// Ancienne structure
{
  "planSelection": {
    "mobile": "label[for=\"select-4120\"]",
    "standard": "label[for=\"select-3088\"]"
  }
}
```

### Après (avec régions)
```javascript
// Nouvelle structure
{
  "planSelection": {
    "backendRegions": {
      "basic": {
        "mobile": {
          "selector": "label[for=\"select-4120\"]",
          "planId": "4120",
          "price": "ZAR 59"
        }
      }
    }
  }
}
```

### Compatibilité

- Si `backendRegion` n'est pas fourni, la valeur par défaut est `"basic"`
- Cela assure la rétrocompatibilité avec les anciennes requêtes

## 📝 Exemples d'utilisation

### Exemple 1 : Abonnement Standard USA

```javascript
const response = await fetch('/api/payment/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: "user123",
    numeroOM: "+1234567890",
    email: "john@example.com",
    motDePasse: "SecurePass123",
    typeDePlan: "standard",
    backendRegion: "usa",
    amount: 17.99
  })
});
```

### Exemple 2 : Abonnement Mobile Afrique du Sud (défaut)

```javascript
const response = await fetch('/api/payment/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: "user456",
    numeroOM: "+27600000000",
    email: "jane@example.com",
    motDePasse: "SecurePass456",
    typeDePlan: "mobile",
    // backendRegion non spécifié → défaut: "basic"
    amount: 59
  })
});
```

## 🔧 Ajout d'une nouvelle région

Pour ajouter une nouvelle région (ex: `europe`) :

1. **Mettre à jour `subscription-selectors.json`** :
```json
{
  "planSelection": {
    "backendRegions": {
      "basic": { /* ... */ },
      "usa": { /* ... */ },
      "europe": {
        "basic": {
          "selector": "label[for=\"select-XXXX\"]",
          "planId": "XXXX",
          "price": "€9.99"
        }
        // ... autres plans
      }
    }
  }
}
```

2. **Aucune modification de code nécessaire** ! Le système détectera automatiquement la nouvelle région.

## ⚠️ Points d'attention

1. **Plans manquants** : Si un plan n'existe pas dans une région, l'étape 3 est automatiquement ignorée
2. **Validation stricte** : Le système valide que le plan existe dans la région avant de démarrer le processus
3. **Traçabilité** : La région backend est enregistrée dans `planActivation` pour audit
4. **Logs enrichis** : Tous les logs incluent maintenant la région backend pour faciliter le débogage

## 📞 Support

Pour toute question sur les régions backend, consultez :
- `/selectors/subscription-selectors.json` - Configuration des sélecteurs
- `/src/services/subscription/subscriptionOrchestrator.js` - Logique d'orchestration
- `/src/services/subscription/steps/step3-selectPlan.js` - Logique de sélection de plan
