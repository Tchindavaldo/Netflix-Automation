# 🎬 Netflix Automation - Plateforme d'Automatisation Netflix

> **Système d'automatisation complet pour la gestion des abonnements Netflix avec intégration de paiement, gestion des sessions et notifications en temps réel.**

---

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Caractéristiques principales](#caractéristiques-principales)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [API Endpoints](#api-endpoints)
- [Structure du projet](#structure-du-projet)
- [Services](#services)
- [Déploiement](#déploiement)
- [Dépannage](#dépannage)
- [Contribution](#contribution)

---

## 🎯 Vue d'ensemble

**Netflix Automation** est une plateforme Node.js/Express conçue pour automatiser entièrement le processus d'abonnement Netflix. Elle utilise Selenium WebDriver et Playwright pour l'automatisation du navigateur, Firebase pour la gestion des données, et Google Drive pour le stockage des snapshots.

### Cas d'usage principaux :
- ✅ Automatisation complète du flux d'abonnement Netflix
- ✅ Gestion des sessions de navigateur
- ✅ Traitement des paiements intégrés
- ✅ Capture et stockage des snapshots HTML
- ✅ Notifications en temps réel via Socket.io
- ✅ Gestion des erreurs avec retry automatique
- ✅ Intégration Firebase pour la persistance des données
- ✅ Notifications push FCM et SMS WhatsApp

---

## ✨ Caractéristiques principales

### 🔐 Gestion des sessions
- Création et gestion des sessions de navigateur
- Support Selenium WebDriver et Playwright
- Monitoring en temps réel des sessions
- Redémarrage automatique en cas de défaillance
- Gestion des cookies et authentification

### 💳 Traitement des paiements
- Intégration complète du flux de paiement Netflix
- Sélection des plans d'abonnement
- Remplissage automatique des formulaires
- Gestion des méthodes de paiement
- Capture des erreurs de paiement avec snapshots

### 📸 Gestion des snapshots
- Capture automatique de l'état des pages
- Stockage sur Google Drive
- Archivage des snapshots
- Compression et optimisation des fichiers
- Gestion des dossiers de snapshots

### 🔔 Système de notifications
- Notifications en temps réel via Socket.io
- Notifications push Firebase Cloud Messaging (FCM)
- Intégration SMS WhatsApp via Twilio
- Gestion des notifications lues/non-lues
- Historique des notifications

### 👥 Gestion des utilisateurs
- Création et gestion des profils utilisateur
- Stockage des données d'abonnement
- Historique des transactions
- Gestion des erreurs d'abonnement

### 🔄 Orchestration des étapes
- Flux d'abonnement en 10 étapes
- Retry automatique avec backoff exponentiel
- Gestion des erreurs granulaire
- Logging détaillé de chaque étape

---

## 🏗️ Architecture

### Architecture générale

```
Netflix-Automation/
├── server.js                    # Point d'entrée principal
├── socket.js                    # Configuration Socket.io
├── src/
│   ├── app.js                  # Configuration Express
│   ├── routes/                 # Définition des routes API
│   ├── controllers/            # Logique métier des endpoints
│   ├── services/               # Services métier
│   │   ├── netflix/            # Services Netflix
│   │   ├── notification/       # Services de notification
│   │   ├── subscription/       # Orchestration d'abonnement
│   │   └── ...
│   └── config/                 # Fichiers de configuration
├── selectors/                  # Sélecteurs CSS/XPath Netflix
├── snapshots/                  # Stockage local des snapshots
├── scripts/                    # Scripts utilitaires
├── config/                     # Fichiers de configuration
└── Dockerfile                  # Configuration Docker

```

### Stack technologique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| **Runtime** | Node.js | 18+ |
| **Framework Web** | Express.js | 4.21.1 |
| **Automatisation** | Selenium WebDriver | 4.33.0 |
| **Automatisation** | Playwright | 1.50.1 |
| **Base de données** | Firebase/Firestore | 7.11.1 |
| **Communication temps réel** | Socket.io | 4.8.1 |
| **Stockage cloud** | Google Drive API | 162.0.0 |
| **Notifications** | Firebase Admin SDK | 13.2.0 |
| **SMS** | Twilio | 5.5.2 |
| **Upload fichiers** | Multer | 1.4.5 |
| **Compression** | Archiver | 7.0.1 |
| **Environnement** | dotenv | 16.4.7 |

---

## 📦 Installation

### Prérequis

- **Node.js** : v18 ou supérieur
- **npm** : v9 ou supérieur
- **Firefox** : Pour Selenium WebDriver (optionnel si utilisation de Playwright)
- **Docker** : Pour le déploiement en conteneur (optionnel)
- **Compte Firebase** : Pour la base de données et authentification
- **Compte Google Cloud** : Pour Google Drive API
- **Compte Twilio** : Pour les notifications SMS (optionnel)

### Installation locale

1. **Cloner le repository**
```bash
git clone <repository-url>
cd Netflix-Automation
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
# Copier le fichier d'environnement
cp .env.dev .env

# Éditer avec vos configurations
nano .env
```

4. **Démarrer le serveur**
```bash
# Mode développement avec auto-reload
npm run start:dev

# Mode production
npm run start:prod

# Mode développement simple
npm start
```

### Installation avec Docker

```bash
# Construire l'image Docker
docker build -t netflix-automation .

# Lancer le conteneur
docker run -p 5000:8080 \
  -e NODE_ENV=production \
  -e HEADLESS=true \
  netflix-automation
```

---

## ⚙️ Configuration

### Variables d'environnement

#### Configuration générale
```env
# Environnement
NODE_ENV=development
PORT=5000
API_BASE_URL=http://localhost:5000

# Mode headless (true pour production)
HEADLESS=true

# Timeouts Selenium (en millisecondes)
SESSION_TIMEOUT=60000
SELENIUM_IMPLICIT_TIMEOUT=20000
SELENIUM_PAGE_LOAD_TIMEOUT=20000
SELENIUM_SCRIPT_TIMEOUT=30000
```

#### Configuration Firebase
```env
# Identifiants Firebase
FB_TYPE=service_account
FB_PROJECT_ID=your-project-id
FB_PRIVATE_KEY_ID=your-key-id
FB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FB_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
FB_CLIENT_ID=your-client-id
FB_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FB_TOKEN_URI=https://oauth2.googleapis.com/token
FB_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FB_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
FB_UNIVERSE_DOMAIN=googleapis.com
```

#### Configuration Google Drive
```env
# OAuth2 Google Drive
GOOGLE_DRIVE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
```

#### Configuration Twilio (SMS)
```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Fichiers de configuration

#### `config/netflix-pricing.json`
Contient les tarifs et plans Netflix disponibles.

#### `config/subscription-data.json`
Données de configuration pour les abonnements.

#### `config/oauth2-credentials.json`
Identifiants OAuth2 pour Google Drive.

---

## 🚀 Utilisation

### Démarrer une session Netflix

```bash
curl -X POST http://localhost:5000/api/netflix/session/start \
  -H "Content-Type: application/json" \
  -d '{"headless": true}'
```

### Lancer un flux d'abonnement complet

```bash
curl -X POST http://localhost:5000/api/subscription/start \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure-password",
    "plan": "premium",
    "paymentMethod": "card"
  }'
```

### Récupérer le statut d'une session

```bash
curl http://localhost:5000/api/netflix/session/status/:sessionId
```

### Arrêter une session

```bash
curl -X POST http://localhost:5000/api/netflix/session/stop/:sessionId
```

### Récupérer les notifications

```bash
curl http://localhost:5000/api/notifications
```

---

## 📡 API Endpoints

### Sessions Netflix

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/netflix/session/start` | Démarrer une nouvelle session |
| `GET` | `/api/netflix/session/status/:id` | Récupérer le statut d'une session |
| `POST` | `/api/netflix/session/stop/:id` | Arrêter une session |
| `POST` | `/api/netflix/session/restart/:id` | Redémarrer une session |
| `GET` | `/api/netflix/session/all` | Récupérer toutes les sessions actives |

### Cookies

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/netflix/cookies/save` | Sauvegarder les cookies |
| `GET` | `/api/netflix/cookies/:sessionId` | Récupérer les cookies |
| `DELETE` | `/api/netflix/cookies/:sessionId` | Supprimer les cookies |

### Pages et Snapshots

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/netflix/page/snapshot/:sessionId` | Capturer un snapshot |
| `GET` | `/api/netflix/page/html/:sessionId` | Récupérer le HTML de la page |
| `POST` | `/api/netflix/page/screenshot` | Prendre une capture d'écran |

### Paiements

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/payment/process` | Traiter un paiement |
| `GET` | `/api/payment/status/:id` | Récupérer le statut du paiement |
| `POST` | `/api/payment/validate` | Valider les détails du paiement |

### Abonnements

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/subscription/start` | Démarrer un flux d'abonnement |
| `GET` | `/api/subscription/status/:id` | Récupérer le statut |
| `POST` | `/api/subscription/cancel/:id` | Annuler un abonnement |

### Utilisateurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/users/create` | Créer un utilisateur |
| `GET` | `/api/users/:id` | Récupérer les infos utilisateur |
| `PUT` | `/api/users/:id` | Mettre à jour un utilisateur |
| `DELETE` | `/api/users/:id` | Supprimer un utilisateur |

### Notifications

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/notifications` | Récupérer toutes les notifications |
| `GET` | `/api/notifications/:id` | Récupérer une notification |
| `POST` | `/api/notifications/:id/read` | Marquer comme lue |
| `POST` | `/api/notifications/send` | Envoyer une notification |

### Google Drive

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/drive/upload` | Uploader un fichier |
| `GET` | `/api/drive/files` | Lister les fichiers |
| `DELETE` | `/api/drive/files/:id` | Supprimer un fichier |

### Santé

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/health` | Vérifier la santé du serveur |

---

## 📂 Structure du projet

### `/src/routes/`
Définition des routes API Express.

```
routes/
├── health.js                    # Route de santé
├── sessionRoutes.js             # Gestion des sessions
├── cookieRoutes.js              # Gestion des cookies
├── pageRoutes.js                # Gestion des pages/snapshots
├── paymentRoutes.js             # Traitement des paiements
├── userRoutes.js                # Gestion des utilisateurs
├── planActivationRoutes.js      # Activation des plans
├── subscriptionRoutes.js        # Flux d'abonnement
└── driveRoutes.js               # Google Drive
```

### `/src/controllers/`
Logique métier des endpoints.

```
controllers/
├── sessionController.js         # Contrôle des sessions
├── cookieController.js          # Contrôle des cookies
├── pageController.js            # Contrôle des pages
├── paymentController.js         # Contrôle des paiements
├── userController.js            # Contrôle des utilisateurs
├── planActivationController.js  # Contrôle de l'activation
├── subscriptionController.js    # Contrôle des abonnements
└── subscriptionErrorController.js # Gestion des erreurs
```

### `/src/services/`
Services métier réutilisables.

```
services/
├── netflix/
│   ├── NetflixSessionManager.js              # Gestionnaire de sessions
│   ├── session/
│   │   ├── startSession.js                   # Démarrage de session
│   │   ├── stopSession.js                    # Arrêt de session
│   │   ├── restartSession.js                 # Redémarrage
│   │   ├── getSessionStatus.js               # Statut de session
│   │   ├── browserService.js                 # Gestion du navigateur
│   │   └── monitoringService.js              # Monitoring
│   ├── cookie/
│   │   └── cookieService.js                  # Gestion des cookies
│   └── page/
│       └── pageSnapshotService.js            # Snapshots de page
├── notification/
│   ├── FCM/
│   │   └── sendPushNotification.service.js   # Notifications push
│   ├── request/
│   │   ├── getNotification.services.js       # Récupérer notification
│   │   ├── getNotificationById.services.js   # Récupérer par ID
│   │   ├── getNotifications.services.js      # Lister notifications
│   │   ├── markNotificationAsRead.services.js # Marquer comme lue
│   │   └── postNotification.service.js       # Créer notification
│   ├── socket/
│   │   └── notificationHandler.js            # Gestion Socket.io
│   └── whatsapp/
│       └── post-sms.service.js               # SMS WhatsApp
├── subscription/
│   ├── subscriptionOrchestrator.js           # Orchestration principale
│   ├── helpers/
│   │   └── retryHelper.js                    # Logique de retry
│   └── steps/
│       ├── step1-startSession.js             # Étape 1
│       ├── step2-navigateToPlanSelection.js  # Étape 2
│       ├── step3-selectPlan.js               # Étape 3
│       ├── step4-clickAfterPlanSelection.js  # Étape 4
│       ├── step5-clickToEmailPassword.js     # Étape 5
│       ├── step6-fillEmailPassword.js        # Étape 6
│       ├── step7-clickToPaymentMethod.js     # Étape 7
│       ├── step8-selectPaymentMethod.js      # Étape 8
│       ├── step9-fillPaymentForm.js          # Étape 9
│       └── step10-submitPayment.js           # Étape 10
├── googleDriveUpload.service.js              # Upload Google Drive
├── fileUpload.service.js                     # Upload fichiers
├── planActivationService.js                  # Activation des plans
├── subscriptionErrorService.js               # Gestion des erreurs
└── userService.js                            # Gestion des utilisateurs
```

### `/selectors/`
Sélecteurs CSS/XPath pour Netflix.

```
selectors/
├── planSelectors.js             # Sélecteurs des plans
├── paymentSelectors.js          # Sélecteurs de paiement
├── formSelectors.js             # Sélecteurs de formulaires
├── navigationSelectors.js       # Sélecteurs de navigation
└── ...
```

### `/config/`
Fichiers de configuration.

```
config/
├── netflix-pricing.json         # Tarifs Netflix
├── subscription-data.json       # Données d'abonnement
└── oauth2-credentials.json      # Credentials OAuth2
```

---

## 🔧 Services

### Netflix Session Manager
Gère le cycle de vie complet des sessions de navigateur.

**Fonctionnalités :**
- Création de sessions avec Selenium/Playwright
- Gestion des timeouts
- Monitoring en temps réel
- Redémarrage automatique
- Gestion des erreurs

### Subscription Orchestrator
Orchestre le flux complet d'abonnement en 10 étapes.

**Étapes :**
1. Démarrage de la session
2. Navigation vers la sélection de plan
3. Sélection du plan
4. Clic après sélection du plan
5. Navigation vers email/mot de passe
6. Remplissage email/mot de passe
7. Navigation vers méthode de paiement
8. Sélection de la méthode de paiement
9. Remplissage du formulaire de paiement
10. Soumission du paiement

**Gestion des erreurs :**
- Retry automatique avec backoff exponentiel
- Capture de snapshots en cas d'erreur
- Logging détaillé
- Notifications d'erreur

### Notification Service
Gère les notifications multi-canaux.

**Canaux :**
- **Socket.io** : Notifications en temps réel
- **FCM** : Notifications push Firebase
- **WhatsApp** : SMS via Twilio
- **Email** : Via Firebase (optionnel)

### Google Drive Upload Service
Gère l'upload et le stockage sur Google Drive.

**Fonctionnalités :**
- Upload de fichiers
- Compression automatique
- Gestion des dossiers
- Archivage des snapshots

---

## 🐳 Déploiement

### Déploiement Docker

1. **Construire l'image**
```bash
docker build -t netflix-automation:latest .
```

2. **Lancer le conteneur**
```bash
docker run -d \
  --name netflix-automation \
  -p 5000:8080 \
  -e NODE_ENV=production \
  -e HEADLESS=true \
  -e PORT=8080 \
  -v /path/to/snapshots:/app/snapshots \
  netflix-automation:latest
```

3. **Vérifier la santé**
```bash
curl http://localhost:5000/health
```

### Déploiement en production

**Recommandations :**
- Utiliser un gestionnaire de processus (PM2, systemd)
- Configurer les variables d'environnement via secrets
- Mettre en place un reverse proxy (Nginx)
- Activer HTTPS
- Configurer les logs
- Mettre en place une surveillance

**Exemple avec PM2 :**
```bash
npm install -g pm2

pm2 start server.js --name "netflix-automation" \
  --env production \
  --instances max \
  --merge-logs

pm2 save
pm2 startup
```

---

## 🐛 Dépannage

### Problèmes courants

#### 1. Erreur de connexion Firefox/Selenium
```
Error: geckodriver not found
```

**Solution :**
```bash
# Télécharger et installer geckodriver
wget https://github.com/mozilla/geckodriver/releases/download/v0.33.0/geckodriver-v0.33.0-linux64.tar.gz
tar -xzf geckodriver-v0.33.0-linux64.tar.gz
sudo mv geckodriver /usr/local/bin/
```

#### 2. Erreur Firebase
```
Error: Firebase credentials not found
```

**Solution :**
- Vérifier que les variables d'environnement Firebase sont correctement configurées
- Vérifier le fichier `mobilpay-c1872-firebase-adminsdk-fbsvc-94cc9e0468.json`
- Vérifier les permissions Firebase

#### 3. Timeout Selenium
```
Error: Timeout waiting for element
```

**Solution :**
- Augmenter les timeouts dans `.env`
- Vérifier les sélecteurs CSS/XPath
- Vérifier la connexion Internet
- Vérifier que Netflix n'a pas changé sa structure

#### 4. Erreur Google Drive
```
Error: Google Drive authentication failed
```

**Solution :**
- Vérifier les credentials OAuth2
- Vérifier le refresh token
- Vérifier les permissions du dossier

### Logs et debugging

**Voir les logs en temps réel :**
```bash
npm run start:dev
```

**Logs Docker :**
```bash
docker logs -f netflix-automation
```

**Activer le mode verbose :**
```bash
DEBUG=* npm start
```

---

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:5000/health
```

### Métriques disponibles
- Nombre de sessions actives
- Statut des sessions
- Erreurs récentes
- Performance des étapes

### Socket.io Events
- `session:started` - Session démarrée
- `session:stopped` - Session arrêtée
- `subscription:progress` - Progression d'abonnement
- `subscription:error` - Erreur d'abonnement
- `notification:new` - Nouvelle notification
- `payment:processed` - Paiement traité

---

## 🔐 Sécurité

### Bonnes pratiques
- ✅ Utiliser des variables d'environnement pour les secrets
- ✅ Ne pas commiter les fichiers `.env`
- ✅ Utiliser HTTPS en production
- ✅ Valider et nettoyer les entrées utilisateur
- ✅ Implémenter une authentification robuste
- ✅ Utiliser des secrets managers (AWS Secrets Manager, etc.)
- ✅ Mettre à jour régulièrement les dépendances
- ✅ Implémenter la limitation de débit (rate limiting)

### Fichiers sensibles
- `.env` - Variables d'environnement
- `mobilpay-c1872-firebase-adminsdk-fbsvc-94cc9e0468.json` - Credentials Firebase
- `config/oauth2-credentials.json` - Credentials OAuth2

---

## 📝 Logs et Audit

### Structure des logs
```
[TIMESTAMP] [LEVEL] [SERVICE] - MESSAGE
```

### Niveaux de log
- `ERROR` - Erreurs critiques
- `WARN` - Avertissements
- `INFO` - Informations générales
- `DEBUG` - Informations de débogage

### Exemple de log
```
2024-01-15 10:30:45 [INFO] [SessionManager] - Session started: sess_123456
2024-01-15 10:30:46 [INFO] [SubscriptionOrchestrator] - Step 1: Starting session
2024-01-15 10:30:50 [INFO] [SubscriptionOrchestrator] - Step 2: Navigating to plan selection
2024-01-15 10:31:00 [ERROR] [PaymentService] - Payment failed: Invalid card
```

---

## 🤝 Contribution

### Guidelines
1. Fork le repository
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Standards de code
- Utiliser ESLint et Prettier
- Respecter la structure modulaire
- Ajouter des tests unitaires
- Documenter les nouvelles fonctionnalités

---

## 📄 Licence

Ce projet est sous licence ISC. Voir le fichier `LICENSE` pour plus de détails.

---

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@example.com
- 💬 Issues : Ouvrir une issue sur GitHub
- 📚 Documentation : Consulter la wiki

---

## 🗺️ Roadmap

### Prochaines fonctionnalités
- [ ] Support de multiples navigateurs (Chrome, Safari)
- [ ] Dashboard de monitoring en temps réel
- [ ] API GraphQL
- [ ] Tests automatisés complets
- [ ] Support de multiples langues
- [ ] Intégration Stripe/PayPal
- [ ] Machine Learning pour la détection d'erreurs
- [ ] Webhooks personnalisés

---

## 📈 Statistiques du projet

- **Langage principal** : JavaScript (Node.js)
- **Nombre de routes** : 40+
- **Nombre de services** : 20+
- **Couverture de tests** : À améliorer
- **Dernière mise à jour** : 2024

---

## 🙏 Remerciements

Merci à tous les contributeurs et à la communauté open-source pour les excellentes bibliothèques utilisées dans ce projet.

---

**Dernière mise à jour** : 2024-01-15  
**Version** : 1.0.0  
**Statut** : Production Ready ✅
