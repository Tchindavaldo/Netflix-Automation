# Étape 1 : Image de base avec Node.js (version slim pour réduire la taille)
FROM node:18-slim

# Étape 2 : Installer Firefox et les dépendances pour Selenium
# Suppression de xvfb et nettoyage des caches
RUN apt-get update && apt-get install -y --no-install-recommends \
    firefox-esr \
    wget \
    curl \
    ca-certificates \
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
# ENV DISPLAY=:99 # Pas nécessaire en mode headless pur

# Timeouts Selenium
ENV SESSION_TIMEOUT=60000
ENV SELENIUM_IMPLICIT_TIMEOUT=20000
ENV SELENIUM_PAGE_LOAD_TIMEOUT=20000
ENV SELENIUM_SCRIPT_TIMEOUT=30000

# Firebase Configuration (valeurs par défaut - à surcharger via secrets en production)
ENV FB_TYPE=service_account
ENV FB_PROJECT_ID=mobilpay-c1872
ENV FB_PRIVATE_KEY_ID=94cc9e0468ad24818430ef10d12114eacd3ed484
ENV FB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDH6eAkTungl8C2\nTayRbDGN+39V9FrRo+QzB/+DZQ5xWqMzOv6ewGQn/BmZTGN1YmWmh1x1cF+Hu9QN\nmJVTgG3ekOGPfBlL7ufzwHvdMAYdZjAZnEsKgCShWE/LmPM0I88qRQoNMX+waDsY\n16btA+KgxDWMxdUW2w6N78ZIJHvyquPSd2W5m5OHTIa9fqSDcoiCsV5I+Hsdfpc0\n6eqU/13nTU7UntVahyLTqx806C3yRvLzjXOiXQA94ICezzlxbHPBtftUH1r5M1KV\nJF9Flqfn9nvxSq7QKs7TlDeEFbzL8LwUJ37eHMGx9GiDbZtdZTewYxRTyIw9bfw/\n2rxC2kO9AgMBAAECggEAHUaxRe/ujS78EFaIrpU/HpFVoQNTZ38OVLDXqOjcOBpz\navW5Qwtev4JKR2pp6E9cHoqVLjeiLdECaWlOePeGX4EtHyOn2rhmbIpkOUymoJiN\n87oxPRzuAFjb+q9v8lNKK+EHa04z6mQhP26Zaf1XK38AbpisL5gt5fhWu8roAe3l\nf/fOfkrwLkVJmdP9e0ggXudhsXqr4loNnpjm9WxJzaCuarWbmuZCBgKvGafhVSo1\nRnqZh4IaQspciKvS6W5wGWFc/hQSs1jMdVQHVXms22Buu7uUyNzpmogVcxvEriR6\nEZRqS8kJb4u3W7gpVU5P4dV8XyPSbC+mWJMI6zj2UQKBgQDnCo0JtH/ZSp1qBD8j\nXgIdyrjq0ysSPtdZj1CWSBnALkGnpWxjqxZfoGWd17uKV1GXz1Ijk5CH1iDqKIMX\nqiOVf7McdBvBkfZjDeJ8HuPkyWG2HBjMDGWqJgTMhVvLKkhXpYkT5/uRlSyi9O7e\nGhKTcZxnKirlA1U3EUeLa41VpQKBgQDdgn09Ha0xV623G391pIXOFyKekYUWeW24\nTSzi4CDyDb98QY+o8+26/bEoNjEAIoamFuKHhdAXPHQvpdVkY5Uq0OOxSpmeFi1L\n+cfnkMds5UdL3QB487XtR0MNSRYpAh5kB85JdDvNZCQ9BCAL7KE0JT1Xgp7aFHjB\nHx7rsjbKOQKBgQDDEm9+sD36EzvRlYBRtkAHM3DqJB2LrC9bWNvr5ziGwQeCKvPX\nO08KsnzZxpp79bnYeZ2amC9B4ZOs4UO+KVMeGNH7xjThPQJRJBoEPnigZT/w6Mwv\nDJCSFsOag0a7xRmLlyKkAgywIMmtVSyRrmXcw+IQYNQSxLugYSCNIOQWWQKBgBJQ\n1uA10vtQf6mzWV+14eZ/nTo1WCbalYr2vq5nz/GT13CDz0guG0sp7PshN/4F3NJg\n9Aw2sVUqh4TlFnb9kPkAWsNvIrKirM4qcjAglYzYjIOmW4KkzDc5fD7d+zoa1b55\nssH6HXPHQwPUkn3J7C5uodrZjx8DMFTvqNPeYY9pAoGBALTtjlXeKlM4poqca1m8\n7nQxbLhgvqc9OAvvm9apt/wg5MQL/6CC+ovmdJXQzaJUoTfqwjr6YpqT4+If+1/m\nbkxX4mxacL1R+KKQf6EUekSxLDhBidKISaSfdwfmyxl1OfS2xOJMT45WSKVtzvXt\nqG26o9VSgXtyC9Sy1glSIlEi\n-----END PRIVATE KEY-----\n"
ENV FB_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mobilpay-c1872.iam.gserviceaccount.com
ENV FB_CLIENT_ID=109151426733125815537
ENV FB_AUTH_URI=https://accounts.google.com/o/oauth2/auth
ENV FB_TOKEN_URI=https://oauth2.googleapis.com/token
ENV FB_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
ENV FB_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40mobilpay-c1872.iam.gserviceaccount.com
ENV FB_UNIVERSE_DOMAIN=googleapis.com

# Google Drive OAuth2 Configuration
ENV GOOGLE_DRIVE_CLIENT_ID="583417452577-j828mc5hmjg4b4smpp4nb935p5qtqvj3.apps.googleusercontent.com"
ENV GOOGLE_DRIVE_CLIENT_SECRET="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"
ENV GOOGLE_DRIVE_REFRESH_TOKEN="1//03VE2WqmYagVICgYIARAAGAMSNwF-L9IrNnsJPaQx5oa7fCBN9RooILkuOnQNu87uJtJZ4bIBC0iKQC7brLdEikLvEazGm4U4W18"
ENV GOOGLE_DRIVE_FOLDER_ID="1AY8yJ2C0w3nMsn2-LV455lnXHdJeSbwJ"

# API Base URL
ENV API_BASE_URL=http://localhost:8080

# Étape 11 : Exposer le port
EXPOSE 8080

# Étape 12 : Healthcheck désactivé
# HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
#     CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Étape 13 : Lancer l'application en mode production avec limite de RAM
CMD echo "🚀 Démarrage de l'application en mode production optimisé..." && \
    node --max-old-space-size=695 server.js
