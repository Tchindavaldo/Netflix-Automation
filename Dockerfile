# Étape 1 : Choisir une image de base avec Node.js
FROM node:18

# Étape 2 : Mettre à jour et installer les dépendances nécessaires pour Playwright
RUN apt-get update && apt-get install -y \
       wget \
       libx11-dev \
       libxkbfile-dev \
       libsecret-1-dev \
       libnss3-dev \
       libgdk-pixbuf2.0-dev \
       libdbus-1-dev \
       libxtst6 \
       && rm -rf /var/lib/apt/lists/*

# Étape 3 : Créer un répertoire de travail dans le conteneur
WORKDIR /app

# Étape 4 : Copier package.json et package-lock.json dans le conteneur
COPY package.json package-lock.json ./

# Étape 5 : Installer les dépendances de l'application
RUN npm install

# Étape 6 : Installer Playwright
RUN npm install playwright

# Étape 7 : Copier tout le code source dans le conteneur
COPY . .

# Étape 8 : Exposer le port sur lequel l'application va tourner (par exemple, port 3000)
EXPOSE 3000

# Étape 9 : Créer un script pour installer Playwright et démarrer l'application
RUN echo '#!/bin/sh' > /app/start.sh
RUN echo 'npx playwright install' >> /app/start.sh
RUN echo 'npm start' >> /app/start.sh

# Étape 10 : Rendre le script exécutable
RUN chmod +x /app/start.sh

# Étape 11 : Démarrer l'application avec le script
CMD ["sh", "/app/start.sh"]
