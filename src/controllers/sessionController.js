// Import des gestionnaires de contrôleur
const startSessionHandler = require('./handlers/session/startSessionHandler');
const stopSessionHandler = require('./handlers/session/stopSessionHandler');
const restartSessionHandler = require('./handlers/session/restartSessionHandler');
const getSessionStatusHandler = require('./handlers/session/getSessionStatusHandler');

/**
 * Contrôleur des sessions Netflix
 * Ce fichier sert de point d'entrée pour les routes et délègue le traitement
 * à des gestionnaires spécifiques pour chaque action.
 */
const sessionController = {
  // Démarrer une nouvelle session Netflix
  startSession: startSessionHandler,
  
  // Arrêter la session Netflix en cours
  stopSession: stopSessionHandler,
  
  // Redémarrer la session Netflix
  restartSession: restartSessionHandler,
  
  // Obtenir le statut de la session actuelle
  getSessionStatus: getSessionStatusHandler
};

module.exports = sessionController;
