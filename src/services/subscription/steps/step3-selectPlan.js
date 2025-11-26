const axios = require('axios');
const selectors = require('../../../../selectors/subscription-selectors.json');
const RetryHelper = require('../helpers/retryHelper');

/**
 * Étape 3: Sélectionner le plan Netflix
 * @param {string} baseUrl - URL de base de l'API
 * @param {string} sessionId - ID de la session
 * @param {string} planType - Type de plan (mobile, basic, standard, premium)
 * @param {string} planActivationId - ID de l'activation du plan
 * @param {string} userId - ID de l'utilisateur (pour traçabilité)
 * @param {Object} subscriptionData - Données complètes de l'abonnement (pour contexte d'erreur)
 * @returns {Promise<Object>} - Résultat de la sélection
 */
async function selectPlan(baseUrl, sessionId, planType, planActivationId, userId, subscriptionData = {}) {
  // console.log(`📍 Étape 3: Sélection du plan ${planType}...`);
  
  const executeStep = async () => {
    try {
      // Récupérer le sélecteur correspondant au type de plan
      const planSelector = selectors.planSelection[planType.toLowerCase()];
      
      if (!planSelector) {
        return {
          success: false,
          error: `Type de plan inconnu: ${planType}. Plans disponibles: ${Object.keys(selectors.planSelection).join(', ')}`
        };
      }

      // L'endpoint attend sessionId en query param, et planSelector dans le body
      const response = await axios.post(
        `${baseUrl}/api/netflix/page/selectPlan?sessionId=${sessionId}`,
        { planSelector }
      );
      
      if (!response.data.success) {
        // Message d'erreur plus explicite
        const errorMsg = response.data.message || 'Échec de la sélection du plan';
        const debugInfo = response.data.debug ? ` | Debug: ${JSON.stringify(response.data.debug)}` : '';
        return {
          success: false,
          error: `${errorMsg}${debugInfo}`
        };
      }

      // NOTE: Netflix ne change pas toujours l'URL après la sélection du plan
      // On ne vérifie donc PAS navigation.changed ici, juste le success
      // console.log(`✅ Plan ${planType} sélectionné avec succès`);
      
      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      // Message d'erreur plus explicite avec détails HTTP si disponible
      let errorMessage = error.message;
      if (error.response) {
        errorMessage = `${error.message} | Status: ${error.response.status}`;
        if (error.response.data) {
          errorMessage += ` | Details: ${JSON.stringify(error.response.data)}`;
        }
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  // Exécuter avec retry et enregistrement d'erreur
  return await RetryHelper.executeWithRetry(executeStep, {
    stepName: 'selectPlan',
    errorContext: {
      userId,
      sessionId,
      planActivationId,
      planType,
      planSelector: selectors.planSelection[planType.toLowerCase()],
      // Inclure TOUT le contexte métier
      email: subscriptionData.email,
      motDePasse: subscriptionData.motDePasse,  // Inclure pour debug
      typeDePlan: subscriptionData.typeDePlan,
      amount: subscriptionData.amount,  // Ajouter le montant
      cardInfo: subscriptionData.cardInfo ? {
        lastFourDigits: subscriptionData.cardInfo.cardNumber?.slice(-4),
        expirationDate: subscriptionData.cardInfo.expirationDate
      } : undefined
    },
    baseUrl
  });
}

module.exports = selectPlan;
