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

# Étape 6 : Installer Playwright et ses dépendances
RUN npm install playwright

# Étape 7 : Installer les navigateurs Playwright
RUN npx playwright install

# Étape 8 : Copier tout le code source dans le conteneur
COPY . .

# Étape 9 : Exposer le port sur lequel l'application va tourner (par exemple, port 3000)
EXPOSE 3000

# Étape 10 : Commande pour démarrer l'application
CMD ["npm", "start"]
