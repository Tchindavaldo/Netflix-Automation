// Chargement des variables d'environnement
if (process.env.NODE_ENV === "production") {
  require("dotenv").config({ path: ".env.prod" });
} else {
  require("dotenv").config({ path: ".env.dev" });
}

const app = require('./src/app');
const http = require('http');
const socket = require('./socket');

const HOST = '0.0.0.0';
const PORT = process.env.PORT || 5000;

// Création du serveur HTTP
const server = http.createServer(app);

// Configuration de Socket.io
socket.init(server);

const initEmailSyncCron = require('./src/scripts/emailSyncCron');

// Démarrage du serveur
server.listen(PORT, HOST, () => {
  // console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
  // Lancer le cron de synchronisation des emails Zoho
  initEmailSyncCron();
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Gestion de l'arrêt propre du serveur
process.on('SIGTERM', () => {
  // console.log('SIGTERM reçu. Arrêt du serveur...');
  server.close(() => {
    // console.log('Serveur arrêté');
  });
});

module.exports = server;
