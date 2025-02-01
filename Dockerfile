# Étape 1 : Choisir une image de base avec Node.js
FROM node:18

# Étape 2 : Créer un répertoire de travail
WORKDIR /app

# Étape 3 : Copier package.json et package-lock.json dans le conteneur
COPY package.json package-lock.json ./

# Étape 4 : Installer les dépendances
RUN npm install

# Étape 5 : Installer Playwright et ses dépendances
RUN npx playwright install --with-deps

# Étape 6 : Copier tout le code source dans le conteneur
COPY . .

# Étape 7 : Exposer le port sur lequel l'app sera exécutée (par exemple, port 3000)
EXPOSE 3000

# Étape 8 : Définir la commande de démarrage
CMD ["npm", "start"]
