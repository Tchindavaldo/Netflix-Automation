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
       libatk1.0-0 \
       libatk-bridge2.0-0 \
       libcups2 \
       libdrm2 \
       libxkbcommon0 \
       libxcomposite1 \
       libxdamage1 \
       libxfixes3 \
       libxrandr2 \
       libgbm1 \
       libasound2 \
       libatspi2.0-0 \
       && rm -rf /var/lib/apt/lists/*

# Étape 3 : Créer un répertoire de travail dans le conteneur
WORKDIR /app

# Étape 4 : Copier package.json et package-lock.json dans le conteneur
COPY package.json package-lock.json ./

# Étape 5 : Installer les dépendances de l'application
RUN npm install

# Étape 6 : Définir la variable d'environnement pour forcer l'installation locale des navigateurs
ENV PLAYWRIGHT_BROWSERS_PATH=0

# Étape 7 : Installer Playwright et télécharger les navigateurs
RUN npm install playwright && npx playwright install

# Étape 8 : Copier tout le code source dans le conteneur
COPY . .

# Étape 9 : Exposer le port sur lequel l'application va tourner (par exemple, port 3000)
EXPOSE 3000

# Étape 10 : Démarrer l'application
CMD ["npm", "start"]
