// Chargement des variables d'environnement
if (process.env.NODE_ENV === "production") {
  require("dotenv").config({ path: ".env.prod" });
} else {
  require("dotenv").config({ path: ".env.dev" });
}

const app = require('./src/app');
const PORT = process.env.PORT || 3000;

// Démarrage du serveur
const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || 'développement'}`);
  console.log(`Mode headless: ${process.env.HEADLESS === 'true' ? 'activé' : 'désactivé'}`);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // En production, vous pourriez vouloir redémarrer le processus ici
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // En production, vous pourriez vouloir redémarrer le processus ici
  process.exit(1);
});

// Gestion de l'arrêt propre du serveur
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu. Arrêt du serveur...');
  server.close(() => {
    console.log('Serveur arrêté');
  });
});

module.exports = server;
