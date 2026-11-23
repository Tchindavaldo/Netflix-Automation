# 📸 Gestion des Snapshots d'Erreur - Mode Local Uniquement

## 🎯 Changement Important

**L'upload automatique vers Google Drive a été complètement désactivé.**

Les snapshots d'erreur sont maintenant **sauvegardés uniquement en local** (dans le conteneur ou sur le système de fichiers local), et seuls les **chemins locaux** et **l'ID de l'erreur** sont enregistrés dans Firebase.

## 📁 Structure de Sauvegarde

### Emplacement des Snapshots

Les snapshots sont sauvegardés dans :
```
/snapshots/planActivationId_<ID>/
├── snapshot_<timestamp>.html          # Page HTML complète
├── snapshot_<timestamp>.png           # Screenshot de la page
└── snapshot_<timestamp>_metadata.json # Métadonnées (URL, titre, etc.)
```

### Exemple
```
/snapshots/planActivationId_abc123/
├── snapshot_1735476000000.html
├── snapshot_1735476000000.png
└── snapshot_1735476000000_metadata.json
```

## 🗄️ Données Enregistrées dans Firebase

Lorsqu'une erreur se produit, les informations suivantes sont enregistrées dans Firebase :

```javascript
{
  errorId: "error_xyz789",               // ID unique de l'erreur
  stepName: "selectPlan",                // Nom de l'étape qui a échoué
  error: "Plan selector not found",      // Message d'erreur
  userId: "user123",
  sessionId: "session456",
  planActivationId: "abc123",
  email: "user@example.com",
  typeDePlan: "standard",
  backendRegion: "usa",
  currentUrl: "https://www.netflix.com/signup/planform",
  attempts: 3,
  timestamp: "2025-12-29T13:00:00.000Z",
  
  // ✅ CHANGEMENT: snapshotUrls contient maintenant des CHEMINS LOCAUX
  // (Format conservé pour compatibilité, mais contenu différent)
  snapshotUrls: {
    htmlUrl: "/snapshots/error_xyz789/snapshot_1735476000000.html",
    screenshotUrl: "/snapshots/error_xyz789/snapshot_1735476000000.png",
    metadataUrl: "/snapshots/error_xyz789/snapshot_1735476000000_metadata.json"
  },
  
  snapshotFolder: "error_xyz789", // Nommé par errorId
  snapshotFolderPath: "error_xyz789" // Pour compatibilité
}
```

## 🔄 Workflow de Gestion des Erreurs

### 1. Capture de l'Erreur

Quand une étape échoue après tous les retries :

```javascript
// Dans retryHelper.js
await this.logErrorToDatabase(baseUrl, {
  stepName: 'selectPlan',
  error: lastError,
  attempts: maxRetries + 1,
  ...errorContext
});
```

### 2. Génération de l'ID et Capture

Le système :
1. Génère un `errorId` unique
2. Capture le snapshot dans un dossier `/snapshots/<errorId>/`

```javascript
const errorId = `error_${Date.now()}_...`;
const snapshotData = await this.captureSnapshot(
  baseUrl,
  sessionId,
  errorId // Dossier nommé par errorId
);
```

### 3. Sauvegarde Locale

Les fichiers sont sauvegardés localement.

### 4. Enregistrement dans Firebase

Les chemins locaux sont enregistrés dans `snapshotUrls` :

```javascript
snapshotUrls = {
  htmlUrl: snapshotData.htmlPath,
  screenshotUrl: snapshotData.screenshotPath,
  metadataUrl: snapshotData.metadataPath
};
```

## 🐳 Gestion dans les Conteneurs Docker

### Persistance des Snapshots

Pour que les snapshots persistent même après un redémarrage du conteneur, utilisez un **volume Docker** :

```yaml
# docker-compose.yml
services:
  netflix-automation:
    volumes:
      - ./snapshots:/app/snapshots  # Monter le dossier snapshots
```

### Accès aux Snapshots

#### Depuis l'hôte
```bash
# Les snapshots sont accessibles dans
./snapshots/planActivationId_<ID>/
```

#### Depuis le conteneur
```bash
# Entrer dans le conteneur
docker exec -it netflix-automation bash

# Naviguer vers les snapshots
cd /app/snapshots

# Lister les dossiers d'erreur
ls -la
```

## 📊 Récupération des Snapshots

### Via l'ID de l'Erreur

1. **Récupérer l'erreur depuis Firebase** :
```javascript
const error = await getErrorById("error_xyz789");
console.log(error.snapshotPaths);
// {
//   htmlPath: "/snapshots/planActivationId_abc123/snapshot_1735476000000.html",
//   screenshotPath: "/snapshots/planActivationId_abc123/snapshot_1735476000000.png",
//   ...
// }
```

2. **Accéder aux fichiers** :
```bash
# HTML
cat /snapshots/planActivationId_abc123/snapshot_1735476000000.html

# Screenshot (copier vers l'hôte)
docker cp netflix-automation:/snapshots/planActivationId_abc123/snapshot_1735476000000.png ./
```

### Via l'API

```javascript
// Endpoint pour récupérer un snapshot
GET /api/snapshots/:planActivationId/:filename

// Exemple
GET /api/snapshots/planActivationId_abc123/snapshot_1735476000000.png
```

## 🗑️ Nettoyage des Snapshots

### Manuel

```bash
# Supprimer les snapshots d'un planActivation spécifique
rm -rf /snapshots/planActivationId_abc123

# Supprimer tous les snapshots de plus de 30 jours
find /snapshots -type d -mtime +30 -exec rm -rf {} \;
```

### Automatique (Recommandé)

Créer un cron job pour nettoyer automatiquement :

```bash
# Ajouter au crontab
0 2 * * * find /app/snapshots -type d -mtime +30 -exec rm -rf {} \;
```

## ⚙️ Configuration

### Variables d'Environnement

```bash
# Chemin de base pour les snapshots (optionnel)
SNAPSHOTS_BASE_PATH=/app/snapshots

# Durée de rétention en jours (optionnel)
SNAPSHOTS_RETENTION_DAYS=30
```

### Désactivation Complète des Snapshots

Si vous voulez désactiver complètement la capture de snapshots :

```javascript
// Dans retryHelper.js, commenter la section capture
// const snapshotData = await this.captureSnapshot(...);
```

## 🔍 Débogage

### Vérifier les Snapshots

```bash
# Lister tous les dossiers de snapshots
ls -la /snapshots/

# Compter le nombre de snapshots
find /snapshots -name "*.html" | wc -l

# Taille totale des snapshots
du -sh /snapshots/
```

### Logs

Les logs indiquent maintenant les chemins locaux :

```
💾 Snapshots sauvegardés en local uniquement
   Dossier local: planActivationId_abc123
✅ Chemins des snapshots enregistrés
   - HTML: /snapshots/planActivationId_abc123/snapshot_1735476000000.html
   - Screenshot: /snapshots/planActivationId_abc123/snapshot_1735476000000.png
   - Metadata: /snapshots/planActivationId_abc123/snapshot_1735476000000_metadata.json
```

## 🚫 Ce Qui a Été Désactivé

### Google Drive Upload

- ❌ Upload automatique vers Google Drive
- ❌ Suppression automatique des fichiers locaux après upload
- ❌ Enregistrement des URLs Drive dans Firebase
- ❌ Endpoint `/api/drive/upload-snapshot` (toujours présent mais non utilisé)

### Fichiers Concernés

- `src/services/subscription/helpers/retryHelper.js` - Logique d'upload supprimée
- `src/controllers/handlers/drive/uploadSnapshotHandler.js` - Non utilisé
- `src/services/googleDriveUpload.service.js` - Non utilisé
- `src/routes/driveRoutes.js` - Routes toujours présentes mais non appelées

## ✅ Avantages du Mode Local

1. **Performance** : Pas de latence réseau pour l'upload
2. **Simplicité** : Pas besoin de configurer Google Drive OAuth
3. **Coût** : Pas de quota Google Drive à gérer
4. **Contrôle** : Fichiers accessibles directement sur le serveur
5. **Persistance** : Avec volumes Docker, les fichiers persistent

## ⚠️ Points d'Attention

1. **Espace Disque** : Surveiller l'espace disque utilisé par les snapshots
2. **Backup** : Mettre en place une stratégie de backup du dossier `/snapshots`
3. **Sécurité** : Protéger l'accès aux snapshots (peuvent contenir des données sensibles)
4. **Rétention** : Implémenter une politique de nettoyage automatique

## 📝 Exemple Complet

### Erreur Capturée

```javascript
{
  id: "error_20251229_130000",
  stepName: "selectPlan",
  error: "Timeout waiting for plan selector",
  userId: "user123",
  planActivationId: "plan_abc123",
  sessionId: "session_xyz789",
  email: "user@example.com",
  typeDePlan: "mobile",
  backendRegion: "usa",
  currentUrl: "https://www.netflix.com/signup/planform",
  attempts: 3,
  timestamp: "2025-12-29T13:00:00.000Z",
  snapshotPaths: {
    htmlPath: "/snapshots/planActivationId_plan_abc123/snapshot_1735476000000.html",
    screenshotPath: "/snapshots/planActivationId_plan_abc123/snapshot_1735476000000.png",
    metadataPath: "/snapshots/planActivationId_plan_abc123/snapshot_1735476000000_metadata.json",
    folderName: "planActivationId_plan_abc123"
  },
  snapshotFolder: "planActivationId_plan_abc123"
}
```

### Récupération

```bash
# 1. Récupérer l'erreur depuis Firebase
curl https://your-firebase.com/errors/error_20251229_130000

# 2. Accéder au snapshot HTML
cat /snapshots/planActivationId_plan_abc123/snapshot_1735476000000.html

# 3. Copier le screenshot vers l'hôte
docker cp netflix-automation:/snapshots/planActivationId_plan_abc123/snapshot_1735476000000.png ./debug/
```

## 🔄 Migration depuis Google Drive

Si vous aviez des snapshots sur Google Drive, ils restent accessibles. Les nouveaux snapshots seront uniquement en local.

Pour migrer les anciens snapshots :
1. Télécharger depuis Google Drive
2. Placer dans `/snapshots/` avec la bonne structure
3. Mettre à jour Firebase avec les chemins locaux

---

**Date de mise à jour** : 2025-12-29  
**Version** : 2.0 (Mode Local Uniquement)
