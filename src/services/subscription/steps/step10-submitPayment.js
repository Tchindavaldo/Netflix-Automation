const axios = require("axios");
const selectors = require("../../../../selectors/subscription-selectors.json");
const RetryHelper = require("../helpers/retryHelper");

/**
 * Étape 10 : Cliquer sur le bouton final de soumission du paiement
 * @param {string} baseUrl - URL de base de l'API
 * @param {string} sessionId - ID de la session
 * @param {string} planActivationId - ID de l'activation du plan
 * @param {string} userId - ID de l'utilisateur (pour traçabilité)
 * @param {Object} subscriptionData - Données complètes de l'abonnement (pour contexte d'erreur)
 * @returns {Promise<Object>} - Résultat du clic final
 */
async function submitPayment(
  baseUrl,
  sessionId,
  planActivationId,
  userId,
  subscriptionData = {}
) {
  // console.log("📍 Étape 10: Clic final sur le bouton de paiement...");

  const executeStep = async () => {
    try {
      // 1. D'abord vérifier l'URL actuelle
      const currentState = await axios.post(
        `${baseUrl}/api/netflix/page/current`,
        { sessionId }
      );
      const initialUrl = currentState.data?.url || "";

      // 2. Cliquer sur le bouton de soumission
      // console.log('👆 Clic sur le bouton de paiement...');
      const clickResponse = await axios.post(`${baseUrl}/api/netflix/page/clickBtn`, {
        sessionId,
        buttonSelector: selectors.paymentForm.submitButton,
        waitForNavigation: true,
        waitForNavigationTimeout: 60000
      });
      
      // console.log(`🔍 Réponse du clic: success=${clickResponse.data.success}, navigation.changed=${clickResponse.data.navigation?.changed}`);

      if (!clickResponse.data.success) {
        return {
          success: false,
          error:
            clickResponse.data.message ||
            "Échec du clic sur le bouton de paiement",
        };
      }

      // 2. Vérifier si la page a changé
      // Si l'URL a changé, c'est un succès
      if (clickResponse.data.navigation?.changed) {
        const newUrl = clickResponse.data.navigation.newUrl || "";
        const previousUrl = clickResponse.data.navigation.before || initialUrl;

        // console.log("✅ Paiement soumis avec succès - Page a changé");
        // console.log(`   Ancienne URL: ${previousUrl}`);
        // console.log(`   Nouvelle URL: ${newUrl}`);

        // On considère que tout changement de page est un succès
        return {
          success: true,
          pageChanged: true,
          data: {
            ...clickResponse.data,
            currentUrl: newUrl,
            previousUrl: previousUrl,
          },
        };
      }

      // 3. Si la page n'a pas changé, attendre plus longtemps avant de déclarer un échec
      // Les paiements peuvent prendre du temps à être traités
      // console.log('ℹ️ Aucun changement détecté immédiatement - Attente supplémentaire...');
      
      // Attendre 15 secondes pour laisser le temps au traitement du paiement
      // console.log('⏳ Attente de 15 secondes avant nouvelle vérification...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Vérifier l'état actuel de la page
      // console.log('🔍 Vérification de l\'URL actuelle...');
      const pageState = await axios.post(`${baseUrl}/api/netflix/page/current`, { sessionId });
      const currentUrl = pageState.data?.url || '';
      // console.log(`📍 URL actuelle: ${currentUrl}`);

      // Vérifier si l'URL a changé après l'attente
      const previousUrl = clickResponse.data.navigation?.before || "";
      if (currentUrl && currentUrl !== previousUrl) {
        // console.log(
        //   "✅ Paiement soumis avec succès - URL a changé après attente"
        // );
        // console.log(`   Ancienne URL: ${previousUrl}`);
        // console.log(`   Nouvelle URL: ${currentUrl}`);

        return {
          success: true,
          pageChanged: true,
          delayedNavigation: true,
          data: {
            ...clickResponse.data,
            currentUrl,
            previousUrl,
          },
        };
      }

      // Si on arrive ici, c'est un échec
      // console.log(
      //   "❌ Échec du paiement - Aucun changement de page ou message de succès détecté"
      // );
      return {
        success: false,
        pageChanged: false,
        error: "Aucune confirmation de paiement détectée après soumission",
        details: {
          urlBefore: clickResponse.data.navigation?.before,
          urlAfter: currentUrl,
          successMessageFound: checkSuccessResponse.data?.exists || false,
        },
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
    stepName: "submitPayment",
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

module.exports = submitPayment;
