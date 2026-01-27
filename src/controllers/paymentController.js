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
  // Initialiser un paiement Mobile Money (Nouveau)
  initMobileMoneyPayment: require('./handlers/payment/initMobileMoneyPaymentHandler'),
};

module.exports = paymentController;
