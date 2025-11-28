const axios = require('axios');
const selectors = require('../../../../selectors/subscription-selectors.json');
const RetryHelper = require('../helpers/retryHelper');

/**
 * Étape 9: Remplir le formulaire de paiement
 * @param {string} baseUrl - URL de base de l'API
 * @param {string} sessionId - ID de la session
 * @param {string} planActivationId - ID de l'activation du plan
 * @param {string} userId - ID de l'utilisateur (pour traçabilité)
 * @param {Object} subscriptionData - Données complètes de l'abonnement (pour contexte d'erreur)
 * @returns {Promise<Object>} - Résultat du remplissage
 */
async function fillPaymentForm(baseUrl, sessionId, planActivationId, userId, subscriptionData = {}) {
  // console.log('📍 Étape 9: Remplissage du formulaire de paiement...');

  const executeStep = async () => {
    try {
      const cardInfo = subscriptionData.cardInfo;
      
      if (!cardInfo) {
        return {
          success: false,
          error: 'Informations de carte manquantes'
        };
      }
      
      const response = await axios.post(`${baseUrl}/api/netflix/payment/form/fill`, {
        sessionId,
        fields: [
          {
            selector: selectors.paymentForm.cardNumber,
            value: cardInfo.cardNumber
          },
          {
            selector: selectors.paymentForm.expirationMonth,
            value: cardInfo.expirationDate
          },
          {
            selector: selectors.paymentForm.securityCode,
            value: cardInfo.securityCode
          },
          {
            selector: selectors.paymentForm.cardholderName,
            value: cardInfo.cardholderName
          },
          {
            selector: selectors.paymentForm.postalCode,
            value: "10001",
            optional: false
          },
          {
            selector: selectors.paymentForm.legalCheckbox,
            value: true,
            optional: true
          }
        ]
      });
      
      if (!response.data.success) {
        return {
          success: false,
          error: response.data.message || 'Échec du remplissage du formulaire de paiement'
        };
      }

      // console.log('✅ Formulaire de paiement rempli avec succès');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Exécuter avec retry et enregistrement d'erreur
  return await RetryHelper.executeWithRetry(executeStep, {
    stepName: 'fillPaymentForm',
    errorContext: {
      userId,
      sessionId,
      planActivationId,
      // Inclure TOUT le contexte métier
      email: subscriptionData.email,
      motDePasse: subscriptionData.motDePasse,
      typeDePlan: subscriptionData.typeDePlan,
      amount: subscriptionData.amount,
      cardInfo: subscriptionData.cardInfo ? {
        lastFourDigits: subscriptionData.cardInfo.cardNumber?.slice(-4),
        expirationDate: subscriptionData.cardInfo.expirationDate
      } : undefined
    },
    baseUrl
  });
}

module.exports = fillPaymentForm;
