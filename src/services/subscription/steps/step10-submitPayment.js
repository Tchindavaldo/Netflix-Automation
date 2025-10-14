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
      // 1. Cliquer sur le bouton de soumission
      const clickResponse = await axios.post(`${baseUrl}/api/netflix/page/clickBtn`, {
        sessionId,
        buttonSelector: selectors.paymentForm.submitButton,
        waitForNavigation: true,  // Attendre la navigation
        waitForNavigationTimeout: 30000  // Attendre jusqu'à 30 secondes
      });
      
      if (!clickResponse.data.success) {
        return {
          success: false,
          error: clickResponse.data.message || 'Échec du clic sur le bouton de paiement'
        };
      }

      // 2. Vérifier si la page a changé
      // Si l'URL a changé, c'est un succès (confirmation de paiement ou autre page)
      if (clickResponse.data.navigation?.changed) {
        const newUrl = clickResponse.data.navigation.newUrl || '';
        console.log('✅ Paiement soumis avec succès - Page a changé');
        console.log(`   Nouvelle URL: ${newUrl}`);
        
        // Vérifier si on est sur une page de succès (ex: confirmation, merci, etc.)
        const successPatterns = ['thank', 'confirmation', 'success', 'merci', 'paiement-reussi'];
        const isSuccessPage = successPatterns.some(pattern => 
          newUrl.toLowerCase().includes(pattern)
        );
        
        return {
          success: true,
          pageChanged: true,
          isSuccessPage,
          data: clickResponse.data
        };
      }
      
      // 3. Si la page n'a pas changé, vérifier si c'est un succès quand même
      // (certains sites affichent un message de succès sans changer d'URL)
      console.log('ℹ️ Vérification de la page après soumission...');
      
      // Attendre un peu pour laisser le temps au traitement
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Vérifier l'état actuel de la page
      const pageState = await axios.post(`${baseUrl}/api/netflix/page/current`, { sessionId });
      const currentUrl = pageState.data?.currentUrl || '';
      
      // Vérifier si l'URL a changé après l'attente
      if (currentUrl && currentUrl !== clickResponse.data.navigation?.before) {
        console.log('✅ Paiement soumis avec succès - URL a changé après attente');
        return {
          success: true,
          pageChanged: true,
          delayedNavigation: true,
          data: { ...clickResponse.data, delayedUrl: currentUrl }
        };
      }
      
      // Si on est toujours sur la même page, vérifier s'il y a un message de succès
      const checkSuccessResponse = await axios.post(`${baseUrl}/api/netflix/page/check`, {
        sessionId,
        checkType: 'element',
        selector: '.success-message, .alert-success, [data-uia="success-message"], .ui-message-success',
        timeout: 5000
      });
      
      if (checkSuccessResponse.data?.exists) {
        console.log('✅ Paiement soumis avec succès - Message de succès détecté');
        return {
          success: true,
          pageChanged: false,
          successMessageDetected: true,
          data: clickResponse.data
        };
      }
      
      // Si on arrive ici, c'est un échec
      console.log('❌ Échec du paiement - Aucun changement de page ou message de succès détecté');
      return {
        success: false,
        pageChanged: false,
        error: 'Aucune confirmation de paiement détectée après soumission',
        details: {
          urlBefore: clickResponse.data.navigation?.before,
          urlAfter: currentUrl,
          successMessageFound: checkSuccessResponse.data?.exists || false
        }
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
