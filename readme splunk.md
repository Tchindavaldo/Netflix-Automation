# Installation

## Splunk Enterprise

### Téléchargement de l'archive

- Rendez-vous sur le site officiel de Splunk.
- Sélectionnez la version Linux correspondant à votre distribution (ex : Oracle Linux 9 / RHEL 9).
- Téléchargez le fichier compressé au format tgz.

### Décompression et déplacement

- Copiez l'archive téléchargée sur votre machine virtuelle centrale.
- Décompressez-la dans le répertoire /opt :
  ```bash
  tar -xvzf splunk-<version>-Linux-x86_64.tgz -C /opt/
  ```
- Renommez le répertoire décompressé pour standardiser le chemin :
  ```bash
  sudo mv /opt/splunk-<version> /opt/splunk
  ```

### Premier démarrage et acceptation de la licence

- Lancez Splunk Enterprise et acceptez la licence :
  ```bash
  sudo /opt/splunk/bin/splunk start --accept-license
  ```
- Lors du premier lancement, créez un compte administrateur avec un nom d'utilisateur et un mot de passe.

### Activation du démarrage automatique

- Pour que Splunk démarre automatiquement au démarrage de la machine virtuelle :
  ```bash
  sudo /opt/splunk/bin/splunk enable boot-start
  ```

### Accès à l'interface web

- Depuis un navigateur sur la machine ou une autre machine du réseau, accédez à :
  ```
  http://localhost:8000
  ```
- Connectez-vous avec le compte administrateur créé précédemment.

## Splunk SOAR

### Téléchargement du package SOAR

- Rendez-vous sur le site officiel de Splunk SOAR.
- Sélectionnez le package Linux correspondant à votre distribution (ex : Oracle Linux 9 / RHEL 9).
- Téléchargez le fichier compressé au format tgz.

### Décompression et installation

- Copiez l'archive téléchargée sur votre machine virtuelle centrale.
- Décompressez l'archive :
  ```bash
  sudo tar -xvzf splunk-soar-install.tgz
  ```
- Créez le répertoire d'installation s'il n'existe pas :
  ```bash
  sudo mkdir -p /opt/splunk-soar
  ```
- Lancez l'installation :
  ```bash
  sudo ./soar-install --splunk-soar-home /opt/splunk-soar
  ```

### Démarrage du service

- Après l'installation, démarrez SOAR :
  ```bash
  cd /opt/splunk-soar/bin/
  ./phantomd_start
  ```
- L'interface SOAR est accessible à :
  ```
  https://localhost:8443
  ```
- Connectez-vous avec le compte administrateur par défaut :
  - Nom d'utilisateur : soar_local_admin
  - Mot de passe : password

# Configuration

## Configuration de Nginx

Pour exporter les journaux générés par Nginx vers Splunk SOAR via Splunk Enterprise, utilisez l'application Splunk App for SOAR Export.

### 1. Installation et configuration de Nginx

#### 1.1 Installation

- Sur votre machine Linux, mettez à jour les paquets et installez Nginx :
  ```bash
  sudo apt update
  sudo apt install nginx -y
  ```
- Vérifiez le statut du service Nginx :
  ```bash
  systemctl status nginx
  ```

#### 1.2 Configuration

- Modifiez le fichier de configuration Nginx :
  ```bash
  sudo nano /etc/nginx/nginx.conf
  ```

##### Configuration des logs

Ajoutez la configuration suivante pour générer des logs exploitables :

- `$remote_addr` : adresse IP du client
- `$remote_user` : utilisateur authentifié (souvent vide)
- `$time_local` : date et heure de la requête
- `$request` : méthode HTTP, ressource demandée, protocole
- `$status` : code HTTP retourné
- `$body_bytes_sent` : taille de la réponse
- `$http_referer` : page d'où provient la requête
- `$http_user_agent` : agent utilisateur
- `$http_x_forwarded_for` : adresse IP réelle si client derrière un proxy

Définissez les fichiers de logs :

```nginx
access_log /var/log/nginx/access.log main;
error_log /var/log/nginx/error.log;
```

Ces fichiers seront lus et indexés par Splunk Enterprise.

##### Inclusion des fichiers complémentaires

- Incluez les types MIME et les fichiers de configuration supplémentaires :

```nginx
include /etc/nginx/mime.types;
default_type application/octet-stream;
include /etc/nginx/conf.d/*.conf;
```

##### Configuration spécifique du site

- Dans `/etc/nginx/conf.d/`, ajoutez `mon_site.conf` avec :

```nginx
server {
    listen 80;
    server_name localhost;
    root /var/www/mon_site;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
```

- Cette configuration écoute sur le port 80, sert les fichiers depuis `/var/www/mon_site` et gère les erreurs.

##### Vérification et redémarrage de Nginx

- Testez la configuration :
  ```bash
  sudo nginx -t
  ```
- Redémarrez Nginx pour appliquer les modifications :
  ```bash
  sudo systemctl restart nginx
  ```

## Configuration de Splunk Enterprise

### 1. Indexation des fichiers de logs Nginx

Pour que Splunk Enterprise puisse analyser les logs générés par Nginx, il faut configurer l'indexation des fichiers de logs.

- Dans l'interface Splunk, allez dans Settings > Data inputs > Files & Directories.
- Ajoutez les chemins suivants :
  - `/var/log/nginx/access.log`
  - `/var/log/nginx/error.log`
- Définissez des sourcetypes personnalisés `nginx_access` et `nginx_error` pour que Splunk puisse interpréter correctement les logs.
- Vérifiez que les logs sont bien indexés en effectuant une recherche simple.

### 2. Installation et configuration de Splunk App for SOAR Export

#### 2.1 Installation

- Téléchargez l'application depuis Splunkbase.
- Importez le fichier `.spl` via Manage Apps > Install app from file.
- Redémarrez Splunk pour activer l'application.

#### 2.2 Configuration

- Récupérez le token d'authentification depuis Splunk SOAR :
  - Rendez-vous dans Administration → User Management → Users.
  - Ouvrez le profil d'un utilisateur d'automatisation ou créez-en un avec le rôle automation.
  - Copiez le token d'autorisation pour l'API REST.
- Dans Splunk Enterprise, ouvrez Splunk App for SOAR Export.
- Collez le token d'authentification dans la section Configuration.

### 3. Création d'une alerte dans Splunk Enterprise pour exporter les logs Nginx vers SOAR

Cette alerte permet de surveiller en continu les logs Nginx et d'envoyer automatiquement les événements vers Splunk SOAR.

- Allez dans Settings → Searches, reports, and alerts.
- Créez une nouvelle alerte avec la requête suivante ciblant les logs Nginx :
  ```splunk
  index="ddos_logs" sourcetype="nginx_access"
  | eval http_status=mvindex(split(_raw, " "), 5)
  | eval client_ip=mvindex(split(_raw, " "), 0)
  | eval startTime=_time
  ```
- Configurez les détails de l'alerte : titre, description, type d'alerte, permissions, expiration.
- Configurez l'action de l'alerte pour "Send to SOAR" via Splunk App for SOAR Export avec les paramètres :
  - Label : event
  - Instance SOAR : instance configurée
  - Nom du conteneur : par exemple Logs Nginx - Suspicious
  - Sévérité : Medium ou High
  - Label : nginx_logs

## Configuration de Splunk SOAR

### 1. Création et construction du playbook

Le playbook est un processus automatisé qui détecte et bloque les adresses IP suspectes selon des patterns DDoS.

- Utilisez l'éditeur visuel de SOAR pour créer un nouveau playbook nommé `ddos-ip-block-on-time-detect`.
- Ce playbook automatise la détection et le blocage des IP suspectes.

### 2. Ajout d'un bloc de filtre conditionnel

- Filtrez les artifacts où `artifact:*.name == ddos_logs` avec un scope `new`.

### 3. Ajout d'un bloc de code personnalisé

- Insérez un code Python qui :
  - Charge un cache persistant des tentatives IP.
  - Vérifie et crée la chaîne iptables `DDOS_BLOCK` si elle n'existe pas.
  - Traite chaque artifact pour extraire IP et timestamp.
  - Détecte les IP avec plus de 10 requêtes en 5 secondes non whitelistées et les bloque.
  - Sauvegarde le cache mis à jour.
  - Envoie des alertes par email.

### 4. Finalisation et activation du playbook

- Reliez tous les blocs au bloc de fin.
- Configurez les paramètres du playbook : sources d'événements, rôles et permissions.
- Activez et enregistrez le playbook pour le rendre opérationnel.

# Présentation des résultats

## 1. Simulation d'attaque avec ApacheBench

### 1.1 Petit jeu de données

- Utilisez ApacheBench (ab) pour simuler des attaques HTTP flood :
  ```bash
  ab -n 20 -c 25 http://192.168.8.102:80/
  ab -n 15 -c 15 "http://[fd00::1]:80/"
  ```
- Explication des options :
  - `-n` : nombre total de requêtes
  - `-c` : nombre de requêtes simultanées
- Notes sur la concurrence et le nombre total de requêtes.

### 1.2 Grand jeu de données

- Utilisez un grand jeu de données de 6993 logs pour tester la performance de SOAR.

## 2. Génération de grand jeu de données

### 2.1 Génération d'un grand dataset de logs Nginx

- Un script Python génère 6000 lignes de logs simulant un flood HTTP.
- Les logs contiennent IP, timestamp, méthode HTTP, URL, code de réponse, taille, user-agent.

### 2.2 Création du conteneur dans SOAR

- Utilisez une commande curl pour créer un conteneur.

### 2.3 Injection des logs dans SOAR via Python

- Un script Python analyse le fichier de logs et crée des artifacts dans le conteneur.

### 2.4 Test du playbook sur le dataset

- Exécutez le playbook `ddos ip block on time detect` sur le conteneur contenant les 6000 logs.
