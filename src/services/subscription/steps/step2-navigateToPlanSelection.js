const axios = require('axios');
const selectors = require('../../../../selectors/subscription-selectors.json');
const RetryHelper = require('../helpers/retryHelper');

/**
 * Étape 2: Naviguer vers la page de sélection du plan
 * @param {string} baseUrl - URL de base de l'API
 * @param {string} sessionId - ID de la session
 * @param {string} planActivationId - ID de l'activation du plan
 * @param {string} userId - ID de l'utilisateur (pour traçabilité)
 * @returns {Promise<Object>} - Résultat de la navigation
 */
async function navigateToPlanSelection(baseUrl, sessionId, planActivationId, userId) {
  console.log('📍 Étape 2: Navigation vers la sélection du plan...');
  
  const executeStep = async () => {
    try {
      const response = await axios.post(`${baseUrl}/api/netflix/page/clickBtn`, {
        sessionId,
        buttonSelector: selectors.navigation.goToPlanSelection
      });
      
      if (!response.data.success) {
        return {
          success: false,
          error: response.data.message || 'Échec du clic sur le bouton'
        };
      }

      // L'endpoint retourne navigation.changed, pas pageChanged
      if (!response.data.navigation?.changed) {
        return {
          success: false,
          error: 'La page n\'a pas changé après le clic'
        };
      }

      console.log('✅ Navigation réussie vers la sélection du plan');
      
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
    stepName: 'navigateToPlanSelection',
    errorContext: {
      userId,
      sessionId,
      planActivationId,
      buttonSelector: selectors.navigation.goToPlanSelection
    },
    baseUrl
  });
}

module.exports = navigateToPlanSelection;
