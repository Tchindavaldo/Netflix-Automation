# Migration Firebase : Google Drive URLs → Local Paths

## 📋 Résumé

Migration du schéma de stockage des snapshots d'erreur de Google Drive URLs vers chemins locaux.

## 🔄 Changements de Schéma

### Avant (avec Google Drive)

```javascript
{
  id: "error_xyz",
  stepName: "selectPlan",
  error: "...",
  // ... autres champs ...
  
  // ❌ ANCIEN: URLs Google Drive
  snapshotUrls: {
    htmlUrl: "https://drive.google.com/file/d/...",
    screenshotUrl: "https://drive.google.com/file/d/...",
    metadataUrl: "https://drive.google.com/file/d/..."
  },
  snapshotFolderPath: "Netflix_Errors/planActivationId_abc123"
}
```

### Après (local uniquement)

```javascript
{
  id: "error_xyz",
  stepName: "selectPlan",
  error: "...",
  // ... autres champs ...
  
  // ✅ NOUVEAU: Chemins locaux
  snapshotPaths: {
    htmlPath: "/snapshots/planActivationId_abc123/snapshot_1735476000000.html",
    screenshotPath: "/snapshots/planActivationId_abc123/snapshot_1735476000000.png",
    metadataPath: "/snapshots/planActivationId_abc123/snapshot_1735476000000_metadata.json",
    folderName: "planActivationId_abc123"
  },
  snapshotFolder: "planActivationId_abc123"
}
```

## 📊 Champs Modifiés

| Ancien Champ | Nouveau Champ | Type | Description |
|--------------|---------------|------|-------------|
| `snapshotUrls` | `snapshotPaths` | Object | URLs Drive → Chemins locaux |
| `snapshotUrls.htmlUrl` | `snapshotPaths.htmlPath` | String | URL → Chemin fichier HTML |
| `snapshotUrls.screenshotUrl` | `snapshotPaths.screenshotPath` | String | URL → Chemin fichier PNG |
| `snapshotUrls.metadataUrl` | `snapshotPaths.metadataPath` | String | URL → Chemin fichier JSON |
| `snapshotFolderPath` | `snapshotFolder` | String | Chemin Drive → Nom dossier local |
| - | `snapshotPaths.folderName` | String | Nom du dossier local |

## 🔧 Règles Firebase (Firestore)

### Collection: `subscriptionErrors`

```javascript
{
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /subscriptionErrors/{errorId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
        
        // Validation du schéma
        allow create: if request.resource.data.keys().hasAll([
          'stepName',
          'error',
          'timestamp'
        ]) &&
        // snapshotPaths est optionnel mais doit avoir la bonne structure si présent
        (!request.resource.data.keys().hasAny(['snapshotPaths']) ||
         request.resource.data.snapshotPaths.keys().hasAll([
           'htmlPath',
           'screenshotPath',
           'metadataPath',
           'folderName'
         ]));
      }
    }
  }
}
```

## 🗄️ Script de Migration (si nécessaire)

Si vous avez des erreurs existantes avec `snapshotUrls` et que vous voulez les convertir :

```javascript
// migration-script.js
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function migrateErrors() {
  const errorsRef = db.collection('subscriptionErrors');
  const snapshot = await errorsRef.where('snapshotUrls', '!=', null).get();
  
  console.log(`🔄 Migration de ${snapshot.size} erreurs...`);
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    
    // Créer snapshotPaths à partir de snapshotUrls (si possible)
    const snapshotPaths = {
      htmlPath: `/snapshots/${data.snapshotFolder || 'unknown'}/snapshot_unknown.html`,
      screenshotPath: `/snapshots/${data.snapshotFolder || 'unknown'}/snapshot_unknown.png`,
      metadataPath: `/snapshots/${data.snapshotFolder || 'unknown'}/snapshot_unknown_metadata.json`,
      folderName: data.snapshotFolder || 'unknown',
      
      // Garder les anciennes URLs en commentaire pour référence
      _oldUrls: data.snapshotUrls
    };
    
    // Mettre à jour le document
    batch.update(doc.ref, {
      snapshotPaths: snapshotPaths,
      snapshotUrls: admin.firestore.FieldValue.delete(), // Supprimer l'ancien champ
      snapshotFolderPath: admin.firestore.FieldValue.delete(), // Supprimer l'ancien champ
      _migrated: true,
      _migrationDate: new Date().toISOString()
    });
    
    count++;
    
    // Firestore limite à 500 opérations par batch
    if (count % 500 === 0) {
      console.log(`   Traité ${count} erreurs...`);
    }
  });
  
  await batch.commit();
  console.log(`✅ Migration terminée : ${count} erreurs migrées`);
}

migrateErrors().catch(console.error);
```

### Exécution

```bash
node migration-script.js
```

## 📝 Requêtes Firebase Mises à Jour

### Avant

```javascript
// Récupérer une erreur avec ses URLs Drive
const error = await db.collection('subscriptionErrors')
  .doc(errorId)
  .get();

const htmlUrl = error.data().snapshotUrls?.htmlUrl;
// Ouvrir dans le navigateur
window.open(htmlUrl, '_blank');
```

### Après

```javascript
// Récupérer une erreur avec ses chemins locaux
const error = await db.collection('subscriptionErrors')
  .doc(errorId)
  .get();

const htmlPath = error.data().snapshotPaths?.htmlPath;
// Télécharger via API
const response = await fetch(`/api/snapshots/download?path=${encodeURIComponent(htmlPath)}`);
const html = await response.text();
```

## 🔍 Requêtes Courantes

### Trouver toutes les erreurs avec snapshots

```javascript
// Avant
const errorsWithSnapshots = await db.collection('subscriptionErrors')
  .where('snapshotUrls', '!=', null)
  .get();

// Après
const errorsWithSnapshots = await db.collection('subscriptionErrors')
  .where('snapshotPaths', '!=', null)
  .get();
```

### Rechercher par dossier

```javascript
// Avant
const errors = await db.collection('subscriptionErrors')
  .where('snapshotFolderPath', '==', 'Netflix_Errors/planActivationId_abc123')
  .get();

// Après
const errors = await db.collection('subscriptionErrors')
  .where('snapshotFolder', '==', 'planActivationId_abc123')
  .get();
```

## 🚀 Déploiement

### Étapes de Déploiement

1. **Backup de la base de données**
   ```bash
   # Exporter toutes les erreurs
   firebase firestore:export gs://your-bucket/backups/before-migration
   ```

2. **Déployer le nouveau code**
   ```bash
   git pull origin main
   docker-compose down
   docker-compose up -d --build
   ```

3. **Vérifier les nouvelles erreurs**
   ```bash
   # Déclencher une erreur de test
   curl -X POST http://localhost:3000/api/test/trigger-error
   
   # Vérifier dans Firebase
   # Les nouvelles erreurs doivent avoir snapshotPaths au lieu de snapshotUrls
   ```

4. **Migration des anciennes données (optionnel)**
   ```bash
   node migration-script.js
   ```

## ⚠️ Compatibilité Ascendante

Le code est compatible avec les deux formats :

```javascript
// Dans votre frontend/backend
function getSnapshotHtml(error) {
  // Nouveau format (prioritaire)
  if (error.snapshotPaths?.htmlPath) {
    return downloadFromLocal(error.snapshotPaths.htmlPath);
  }
  
  // Ancien format (fallback)
  if (error.snapshotUrls?.htmlUrl) {
    return downloadFromDrive(error.snapshotUrls.htmlUrl);
  }
  
  return null;
}
```

## 📊 Monitoring

### Métriques à Surveiller

```javascript
// Nombre d'erreurs avec nouveau format
db.collection('subscriptionErrors')
  .where('snapshotPaths', '!=', null)
  .count()
  .get();

// Nombre d'erreurs avec ancien format
db.collection('subscriptionErrors')
  .where('snapshotUrls', '!=', null)
  .count()
  .get();

// Erreurs migrées
db.collection('subscriptionErrors')
  .where('_migrated', '==', true)
  .count()
  .get();
```

## 🔙 Rollback

Si vous devez revenir en arrière :

1. **Restaurer le code précédent**
   ```bash
   git checkout <previous-commit>
   docker-compose down
   docker-compose up -d --build
   ```

2. **Restaurer la base de données (si migration effectuée)**
   ```bash
   firebase firestore:import gs://your-bucket/backups/before-migration
   ```

## ✅ Checklist de Migration

- [ ] Backup Firebase effectué
- [ ] Nouveau code déployé
- [ ] Test de création d'erreur avec snapshots
- [ ] Vérification du format `snapshotPaths` dans Firebase
- [ ] Migration des anciennes données (si nécessaire)
- [ ] Mise à jour du frontend pour utiliser `snapshotPaths`
- [ ] Documentation mise à jour
- [ ] Équipe informée du changement

---

**Date de migration** : 2025-12-29  
**Version** : 2.0
