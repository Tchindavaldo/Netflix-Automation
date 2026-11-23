const getCookiesHandler = require('./handlers/cookie/getCookiesHandler');
const updateCookiesHandler = require('./handlers/cookie/updateCookiesHandler');

/**
 * Contrôleur des cookies Netflix
 * Ce fichier sert de point d'entrée pour les routes et délègue le traitement
 * à des gestionnaires spécifiques pour chaque action.
 */
const cookieController = {
  // Récupérer les cookies de la session
  getCookies: getCookiesHandler,

  // Mettre à jour les cookies de la session
  updateCookies: updateCookiesHandler
};

module.exports = cookieController;
