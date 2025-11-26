const axios = require('axios');
const selectors = require('../../../../selectors/subscription-selectors.json');
const RetryHelper = require('../helpers/retryHelper');

/**
 * Étape 6: Remplir le formulaire email/mot de passe
 * @param {string} baseUrl - URL de base de l'API
 * @param {string} sessionId - ID de la session
 * @param {string} planActivationId - ID de l'activation du plan
 * @param {string} userId - ID de l'utilisateur (pour traçabilité)
 * @param {Object} subscriptionData - Données complètes de l'abonnement (pour contexte d'erreur)
 * @returns {Promise<Object>} - Résultat du remplissage
 */
async function fillEmailPassword(baseUrl, sessionId, planActivationId, userId, subscriptionData = {}) {
  // console.log('📍 Étape 6: Remplissage email et mot de passe...');

  const executeStep = async () => {
    try {
      const response = await axios.post(`${baseUrl}/api/netflix/form/fill`, {
        sessionId,
        fields: [
          {
            selector: selectors.authentication.email,
            value: subscriptionData.email,
            type: 'input'
          },
          {
            selector: selectors.authentication.password,
            value: subscriptionData.motDePasse,
            type: 'input'
          }
        ]
      });
      
      if (!response.data.success) {
        return {
          success: false,
          error: response.data.message || 'Échec du remplissage du formulaire'
        };
      }

      // console.log('✅ Email et mot de passe remplis avec succès');
      
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
    stepName: 'fillEmailPassword',
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

module.exports = fillEmailPassword;
