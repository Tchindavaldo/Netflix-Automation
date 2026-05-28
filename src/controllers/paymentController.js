// Import du gestionnaire de paiement
const initPaymentHandler = require('./handlers/payment/initPaymentHandler');

/**
 * Contrôleur des paiements Orange Money
 * Ce fichier sert de point d'entrée pour les routes de paiement
 * et délègue le traitement au gestionnaire spécifique.
 */
const paymentController = {
  // Initialiser un paiement Orange Money
  initPayment: initPaymentHandler,
  // Initialiser un paiement Mobile Money (Digikuntz)
  initMobileMoneyPayment: require('./handlers/payment/initMobileMoneyPaymentHandler'),
  // Webhook callback Digikuntz (events temps réel)
  webhook: require('./handlers/payment/webhookHandler'),
  // Vérification manuelle du statut (fallback / debug)
  checkStatus: require('./handlers/payment/checkPaymentStatusHandler'),
};

module.exports = paymentController;
