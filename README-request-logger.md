# Netflix Request Logger

## Description
Service qui intercepte et log toutes les requêtes HTTP POST lorsque vous cliquez sur le bouton "Start Membership" sur Netflix. Permet une navigation manuelle dans l'interface graphique tout en capturant automatiquement les requêtes réseau.

## Fonctionnalités
- 🌐 **Navigation manuelle** : Vous naviguez vous-même dans le navigateur
- 🔍 **Interception automatique** : Capture toutes les requêtes POST
- 📝 **Logging complet** : Headers, body, URL pour chaque requête
- 📊 **Rapport détaillé** : Génération d'un rapport JSON final
- ⏰ **Timestamps** : Horodatage précis de chaque requête

## Installation

Assurez-vous que Playwright est installé :
```bash
npm install playwright
```

## Utilisation

### Méthode 1 : Script de lancement simple
```bash
node start-logger.js
```

### Méthode 2 : Utilisation directe
```bash
node netflix-request-logger.js
```

## Processus d'utilisation

1. **Lancer le service** : `node start-logger.js`
2. **Naviguer manuellement** vers `https://www.netflix.com/signup/creditoption`
3. **Remplir le formulaire** d'inscription normalement
4. **Cliquer sur "Start Membership"**
5. **Observer les logs** dans la console en temps réel
6. **Arrêter avec Ctrl+C** pour générer le rapport final

## Fichiers générés

- `netflix-requests.log` : Log détaillé de toutes les requêtes
- `netflix-requests-report.json` : Rapport structuré final

## Format des logs

Chaque requête POST interceptée contient :
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "method": "POST",
  "url": "https://www.netflix.com/api/...",
  "headers": {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "...",
    // ... tous les headers
  },
  "body": "param=...", // Corps de la requête
  "type": "REQUEST" // ou "RESPONSE"
}
```

## Avantages de cette approche

- ✅ **Navigation naturelle** : Vous gardez le contrôle total
- ✅ **Capture complète** : Aucune requête POST n'est manquée
- ✅ **Logs détaillés** : Headers, body, timestamps
- ✅ **Facile à utiliser** : Un seul script à lancer
- ✅ **Rapport structuré** : Données exploitables en JSON

## Dépannage

### Erreur "Playwright not found"
```bash
npm install playwright
npx playwright install chromium
```

### Le navigateur ne s'ouvre pas
Vérifiez que vous êtes dans un environnement graphique (pas en SSH sans X11).

### Permissions
Si vous avez des erreurs de permissions :
```bash
chmod +x start-logger.js
```

## Exemple de sortie

```
🔴 REQUÊTE POST INTERCEPTÉE:
⏰ Timestamp: 2024-01-15T10:30:45.123Z
🌐 URL: https://www.netflix.com/api/aui/pathEvaluator/web/%5E2.0.0
📋 Headers: {
  "Content-Type": "application/x-www-form-urlencoded",
  "X-Netflix.uiVersion": "v7287ca98",
  ...
}
📦 Body: param=%7B%22flow%22%3A%22signupSimplicity%22...
```

## Notes importantes

- Le service capture **TOUTES** les requêtes POST, pas seulement celle du bouton
- Les logs sont sauvegardés en temps réel dans `netflix-requests.log`
- Le rapport final JSON est généré à l'arrêt du service
- Gardez la console ouverte pendant toute la navigation
