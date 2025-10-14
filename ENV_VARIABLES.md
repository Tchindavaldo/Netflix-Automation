# Variables d'environnement requises

Ce document liste toutes les variables d'environnement sensibles qui doivent être configurées via **GitHub Secrets** ou fournies au runtime lors du déploiement Docker.

## 🔐 GitHub Secrets à configurer

Allez dans `Settings > Secrets and variables > Actions` de votre repository GitHub et ajoutez les secrets suivants :

### Firebase Configuration

| Variable | Description | Exemple (Ne PAS utiliser en production) |
|----------|-------------|----------------------------------------|
| `FB_PROJECT_ID` | ID du projet Firebase | `mobilpay-c1872` |
| `FB_PRIVATE_KEY_ID` | ID de la clé privée Firebase | `94cc9e0468ad...` |
| `FB_PRIVATE_KEY` | Clé privée Firebase (format complet) | `-----BEGIN PRIVATE KEY-----\n...` |
| `FB_CLIENT_EMAIL` | Email du service account Firebase | `firebase-adminsdk-fbsvc@...` |
| `FB_CLIENT_ID` | ID client Firebase | `109151426733125815537` |
| `FB_CLIENT_X509_CERT_URL` | URL du certificat X509 | `https://www.googleapis.com/robot/v1/metadata/x509/...` |

### Google Drive OAuth2 Configuration

| Variable | Description | Exemple |
|----------|-------------|---------|
| `GOOGLE_DRIVE_CLIENT_ID` | Client ID OAuth2 Google Drive | `583417452577-...apps.googleusercontent.com` |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Client Secret OAuth2 | `GOCSPX-...` |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Refresh Token OAuth2 | `1//03VE2WqmYa...` |
| `GOOGLE_DRIVE_FOLDER_ID` | ID du dossier Google Drive partagé | `1AY8yJ2C0w3nMsn2-LV455lnXHdJeSbwJ` |

## 🚀 Utilisation avec Docker

### Option 1 : Variables d'environnement directes

```bash
docker run -e FB_PROJECT_ID="..." \
           -e FB_PRIVATE_KEY_ID="..." \
           -e FB_PRIVATE_KEY="..." \
           -e GOOGLE_DRIVE_CLIENT_ID="..." \
           -e GOOGLE_DRIVE_CLIENT_SECRET="..." \
           # ... autres variables
           votre-image
```

### Option 2 : Fichier .env (Recommandé pour développement local)

1. Créez un fichier `.env.local` (déjà dans .gitignore)
2. Ajoutez toutes les variables sensibles
3. Utilisez avec docker-compose :

```yaml
version: '3.8'
services:
  app:
    build: .
    env_file:
      - .env.local
```

### Option 3 : GitHub Actions (Recommandé pour CI/CD)

Dans votre workflow GitHub Actions (`.github/workflows/deploy.yml`) :

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Build and push Docker image
        env:
          FB_PROJECT_ID: ${{ secrets.FB_PROJECT_ID }}
          FB_PRIVATE_KEY_ID: ${{ secrets.FB_PRIVATE_KEY_ID }}
          FB_PRIVATE_KEY: ${{ secrets.FB_PRIVATE_KEY }}
          FB_CLIENT_EMAIL: ${{ secrets.FB_CLIENT_EMAIL }}
          FB_CLIENT_ID: ${{ secrets.FB_CLIENT_ID }}
          FB_CLIENT_X509_CERT_URL: ${{ secrets.FB_CLIENT_X509_CERT_URL }}
          GOOGLE_DRIVE_CLIENT_ID: ${{ secrets.GOOGLE_DRIVE_CLIENT_ID }}
          GOOGLE_DRIVE_CLIENT_SECRET: ${{ secrets.GOOGLE_DRIVE_CLIENT_SECRET }}
          GOOGLE_DRIVE_REFRESH_TOKEN: ${{ secrets.GOOGLE_DRIVE_REFRESH_TOKEN }}
          GOOGLE_DRIVE_FOLDER_ID: ${{ secrets.GOOGLE_DRIVE_FOLDER_ID }}
        run: |
          docker build \
            --build-arg FB_PROJECT_ID="$FB_PROJECT_ID" \
            --build-arg FB_PRIVATE_KEY_ID="$FB_PRIVATE_KEY_ID" \
            # ... autres variables
            -t votre-image .
```

## ⚠️ Sécurité

1. **Ne JAMAIS commiter** les fichiers suivants :
   - `.env.local`
   - `.env.prod` (s'il contient des secrets)
   - `config/oauth2-credentials.json`
   - `config/oauth2-tokens.json`

2. **Vérifier le .gitignore** contient :
   ```
   .env.local
   .env.*.local
   config/oauth2-*.json
   ```

3. **Rotation des secrets** : Changez régulièrement vos clés et tokens

## 📝 Notes

- Les variables non-sensibles (URLs publiques, types, etc.) restent dans le Dockerfile
- Les variables sensibles DOIVENT être fournies au runtime
- Pour le développement local, utilisez `.env.local`
- Pour la production, utilisez GitHub Secrets + votre plateforme de déploiement
