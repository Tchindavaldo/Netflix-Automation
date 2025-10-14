const axios = require("axios");
const selectors = require("../../../../selectors/subscription-selectors.json");
const RetryHelper = require("../helpers/retryHelper");

/**
 * Étape 2: Naviguer vers la page de sélection du plan
 * @param {string} baseUrl - URL de base de l'API
 * @param {string} sessionId - ID de la session
 * @param {string} planActivationId - ID de l'activation du plan
 * @param {string} userId - ID de l'utilisateur (pour traçabilité)
 * @param {Object} subscriptionData - Données complètes de l'abonnement (pour contexte d'erreur)
 * @returns {Promise<Object>} - Résultat de la navigation
 */
async function navigateToPlanSelection(
  baseUrl,
  sessionId,
  planActivationId,
  userId,
  subscriptionData = {}
) {
  console.log("📍 Étape 2: Navigation vers la sélection du plan...");

  const executeStep = async () => {
    try {
      // 1. Vérifier d'abord si on est déjà sur la page de sélection du plan
      const currentPageResponse = await axios.post(
        `${baseUrl}/api/netflix/page/current`,
        { sessionId }
      );

      if (currentPageResponse.data?.currentUrl) {
        const currentUrl = currentPageResponse.data.currentUrl;
        
        // Vérifier si l'URL contient déjà PLAN_SELECTION_CONTEXT
        if (currentUrl.includes('PLAN_SELECTION_CONTEXT')) {
          console.log("✅ Déjà sur la page de sélection du plan, pas besoin de cliquer");
          return {
            success: true,
            data: {
              alreadyOnPage: true,
              currentUrl: currentUrl,
            },
          };
        }
      }

      // 2. Si on n'est pas sur la bonne page, cliquer sur le bouton
      const response = await axios.post(
        `${baseUrl}/api/netflix/page/clickBtn`,
        {
          sessionId,
          buttonSelector: selectors.navigation.goToPlanSelection,
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
        // Vérifier si on est maintenant sur la bonne page même si l'URL n'a pas changé
        const afterUrl = response.data.navigation?.after || "";
        if (afterUrl.includes('PLAN_SELECTION_CONTEXT')) {
          console.log("✅ Navigation réussie vers la sélection du plan (URL contenait déjà PLAN_SELECTION_CONTEXT)");
          return {
            success: true,
            data: response.data,
          };
        }
        
        return {
          success: false,
          error: "La page n'a pas changé après le clic",
        };
      }

      console.log("✅ Navigation réussie vers la sélection du plan");

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

  // Exécuter avec retry et enregistrement d'erreur
  return await RetryHelper.executeWithRetry(executeStep, {
    stepName: "navigateToPlanSelection",
    errorContext: {
      userId,
      sessionId,
      planActivationId,
      buttonSelector: selectors.navigation.goToPlanSelection,
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

module.exports = navigateToPlanSelection;
