const axios = require('axios');
const selectors = require('../../../../selectors/subscription-selectors.json');
const RetryHelper = require('../helpers/retryHelper');

/**
 * Étape 10 : Cliquer sur le bouton final de soumission du paiement
 * @param {string} baseUrl - URL de base de l'API
 * @param {string} sessionId - ID de la session
 * @param {string} planActivationId - ID de l'activation du plan
 * @param {string} userId - ID de l'utilisateur (pour traçabilité)
 * @param {Object} subscriptionData - Données complètes de l'abonnement (pour contexte d'erreur)
 * @returns {Promise<Object>} - Résultat du clic final
 */
async function submitPayment(baseUrl, sessionId, planActivationId, userId, subscriptionData = {}) {
  console.log('📍 Étape 10: Clic final sur le bouton de paiement...');
  
  const executeStep = async () => {
    try {
      const response = await axios.post(`${baseUrl}/api/netflix/page/clickBtn`, {
        sessionId,
        buttonSelector: selectors.paymentForm.submitButton
      });
      
      if (!response.data.success) {
        return {
          success: false,
          error: response.data.message || 'Échec du clic sur le bouton de paiement'
        };
      }

      // IMPORTANT: Vérifier si la page a changé
      // Si l'URL change, c'est un succès (confirmation de paiement ou autre page)
      // Si l'URL ne change pas, c'est un échec (erreur de validation, etc.)
      if (response.data.navigation?.changed) {
        console.log('✅ Paiement soumis avec succès - Page a changé');
        console.log(`   Nouvelle URL: ${response.data.navigation?.newUrl || 'N/A'}`);
        
        return {
          success: true,
          pageChanged: true,
          data: response.data
        };
      } else {
        console.log('⚠️ Paiement soumis mais page inchangée - Considéré comme échec');
        
        return {
          success: false,
          pageChanged: false,
          error: 'La page n\'a pas changé après soumission du paiement - Validation échouée'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Exécuter avec retry et enregistrement d'erreur
  return await RetryHelper.executeWithRetry(executeStep, {
    stepName: 'submitPayment',
    errorContext: {
      userId,
      sessionId,
      planActivationId,
      buttonSelector: selectors.paymentForm.submitButton,
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

module.exports = submitPayment;
