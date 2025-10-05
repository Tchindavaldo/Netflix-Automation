# Étape 1 : Image de base avec Node.js
FROM node:18

# Étape 2 : Installer Firefox et les dépendances pour Selenium
RUN apt-get update && apt-get install -y \
    firefox-esr \
    wget \
    curl \
    ca-certificates \
    # Dépendances pour Firefox et Selenium
    libgtk-3-0 \
    libdbus-glib-1-2 \
    libxt6 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgdk-pixbuf2.0-0 \
    libxfixes3 \
    libxkbcommon0 \
    libgbm1 \
    libdrm2 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Étape 3 : Définir le répertoire de travail
WORKDIR /app

# Étape 4 : Copier le GeckoDriver local et l'installer
COPY geckodriver-v0.33.0-linux64.tar.gz /tmp/
RUN tar -xzf /tmp/geckodriver-v0.33.0-linux64.tar.gz -C /usr/local/bin/ && \
    chmod +x /usr/local/bin/geckodriver && \
    rm /tmp/geckodriver-v0.33.0-linux64.tar.gz

# Étape 5 : Vérifier les versions installées
RUN firefox-esr --version && geckodriver --version

# Étape 6 : Copier les fichiers de dépendances
COPY package*.json ./

# Étape 7 : Installer les dépendances Node.js
RUN npm install --production

# Étape 8 : Copier le code source
COPY . .

# Étape 9 : Créer les dossiers nécessaires
RUN mkdir -p snapshots screenshots logs

# Étape 10 : Variables d'environnement
ENV NODE_ENV=production
ENV HEADLESS=true
ENV PORT=8080
ENV DISPLAY=:99

# Étape 11 : Exposer le port
EXPOSE 8080

# Étape 12 : Healthcheck pour vérifier que l'API répond
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Étape 13 : Démarrer Xvfb en arrière-plan et lancer l'application en production
CMD Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset & \
    sleep 2 && \
    echo "✅ Xvfb démarré" && \
    echo "🚀 Démarrage de l'application en mode production..." && \
    npm run start:prod
