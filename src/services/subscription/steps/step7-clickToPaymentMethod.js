const axios = require("axios");
const selectors = require("../../../../selectors/subscription-selectors.json");
const RetryHelper = require("../helpers/retryHelper");

/**
 * Étape 7: Clic pour aller à la sélection de la méthode de paiement
 * @param {string} baseUrl - URL de base de l'API
 * @param {string} sessionId - ID de la session
 * @param {string} planActivationId - ID de l'activation du plan
 * @param {string} userId - ID de l'utilisateur (pour traçabilité)
 * @param {Object} subscriptionData - Données complètes de l'abonnement (pour contexte d'erreur)
 * @returns {Promise<Object>} - Résultat du clic
 */
async function clickToPaymentMethod(
  baseUrl,
  sessionId,
  planActivationId,
  userId,
  subscriptionData = {}
) {
  // console.log(
  //   "📍 Étape 7: Navigation vers la sélection de la méthode de paiement..."
  // );

  const executeStep = async () => {
    try {
      const response = await axios.post(
        `${baseUrl}/api/netflix/page/clickBtn`,
        {
          sessionId,
          buttonSelector: selectors.navigation.nextToPaymentMethod,
        }
      );

      if (!response.data.success) {
        return {
          success: false,
          error: response.data.message || "Échec du clic sur le bouton",
        };
      }

      // L'endpoint retourne navigation.changed, pas pageChanged
      if (!response.data.navigation?.changed) {
        return {
          success: false,
          error: "La page n'a pas changé après le clic",
        };
      }

      // console.log(
      //   "✅ Navigation réussie vers la sélection de la méthode de paiement"
      // );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  };

  return await RetryHelper.executeWithRetry(executeStep, {
    stepName: "clickToPaymentMethod",
    errorContext: {
      userId,
      sessionId,
      planActivationId,
      buttonSelector: selectors.navigation.nextToPaymentMethod,
      // Inclure TOUT le contexte métier
      email: subscriptionData.email,
      motDePasse: subscriptionData.motDePasse,
      typeDePlan: subscriptionData.typeDePlan,
      amount: subscriptionData.amount,
      cardInfo: subscriptionData.cardInfo
        ? {
            lastFourDigits: subscriptionData.cardInfo.cardNumber?.slice(-4),
            expirationDate: subscriptionData.cardInfo.expirationDate,
          }
        : undefined,
    },
    baseUrl,
  });
}

module.exports = clickToPaymentMethod;
