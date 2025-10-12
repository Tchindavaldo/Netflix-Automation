const axios = require('axios');
const selectors = require('../../../../selectors/subscription-selectors.json');
const RetryHelper = require('../helpers/retryHelper');

/**
 * Étape 8: Sélectionner la méthode de paiement (Carte de crédit/débit)
 * @param {string} baseUrl - URL de base de l'API
 * @param {string} sessionId - ID de la session
 * @param {string} planActivationId - ID de l'activation du plan
 * @param {string} userId - ID de l'utilisateur (pour traçabilité)
 * @returns {Promise<Object>} - Résultat de la sélection
 */
async function selectPaymentMethod(baseUrl, sessionId, planActivationId, userId) {
  console.log('📍 Étape 8: Sélection de la méthode de paiement (Carte de crédit/débit)...');
  
  const executeStep = async () => {
    try {
      const response = await axios.post(`${baseUrl}/api/netflix/payment/select`, {
        sessionId,
        selector: selectors.paymentMethod.creditDebitCard
      });
      
      if (!response.data.success) {
        return {
          success: false,
          error: response.data.message || 'Échec de la sélection de la méthode de paiement'
        };
      }

      // L'endpoint retourne navigation.changed, pas pageChanged
      if (!response.data.navigation?.changed) {
        return {
          success: false,
          error: 'La page n\'a pas changé après la sélection'
        };
      }

      console.log('✅ Méthode de paiement sélectionnée avec succès');
      
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

  return await RetryHelper.executeWithRetry(executeStep, {
    stepName: 'selectPaymentMethod',
    errorContext: {
      userId,
      sessionId,
      planActivationId,
      selector: selectors.paymentMethod.creditDebitCard
    },
    baseUrl
  });
}

module.exports = selectPaymentMethod;
