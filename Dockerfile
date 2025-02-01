# Étape 1 : Choisir une image de base avec Node.js
FROM node:18

# Étape 2 : Créer un répertoire de travail dans le conteneur
WORKDIR /app

# Étape 3 : Copier package.json et package-lock.json dans le conteneur
COPY package.json package-lock.json ./

# Étape 4 : Installer les dépendances de l'application
RUN npm install

# Étape 5 : Installer Playwright et ses dépendances
# Si 'npx playwright install --with-deps' ne fonctionne pas, nous tentons une autre installation explicite de Playwright.
RUN npm install playwright

# Étape 6 : Copier tout le code source dans le conteneur
COPY . .

# Étape 7 : Exposer le port sur lequel l'application va tourner (par exemple, port 3000)
EXPOSE 3000

# Étape 8 : Commande pour démarrer l'application
CMD ["npm", "start"]
