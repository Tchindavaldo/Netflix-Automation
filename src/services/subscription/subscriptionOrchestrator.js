const step1_startSession = require("./steps/step1-startSession");
const step2_navigateToPlanSelection = require("./steps/step2-navigateToPlanSelection");
const step3_selectPlan = require("./steps/step3-selectPlan");
const step4_clickAfterPlanSelection = require("./steps/step4-clickAfterPlanSelection");
const step5_clickToEmailPassword = require("./steps/step5-clickToEmailPassword");
const step6_fillEmailPassword = require("./steps/step6-fillEmailPassword");
const step7_clickToPaymentMethod = require("./steps/step7-clickToPaymentMethod");
const step8_selectPaymentMethod = require("./steps/step8-selectPaymentMethod");
const step9_fillPaymentForm = require("./steps/step9-fillPaymentForm");
const step10_submitPayment = require("./steps/step10-submitPayment");
const axios = require("axios");

/**
 * Orchestrateur principal du processus d'abonnement Netflix
 * Gère toutes les étapes du processus d'abonnement de bout en bout
 */
class SubscriptionOrchestrator {
  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  /**
   * Exécuter le processus complet d'abonnement Netflix
   * @param {Object} subscriptionData - Données pour l'abonnement
   * @param {string} subscriptionData.typeDePlan - Type de plan (mobile, basic, standard, premium)
   * @param {string} subscriptionData.email - Email de l'utilisateur
   * @param {string} subscriptionData.motDePasse - Mot de passe de l'utilisateur
   * @param {string} subscriptionData.planActivationId - ID de l'activation du plan
   * @param {string} subscriptionData.userId - ID de l'utilisateur (pour traçabilité)
   * @param {Object} subscriptionData.cardInfo - Informations de la carte
   * @param {string} subscriptionData.cardInfo.cardNumber - Numéro de carte
   * @param {string} subscriptionData.cardInfo.expirationDate - Date d'expiration (MM/YY)
   * @param {string} subscriptionData.cardInfo.securityCode - Code de sécurité
   * @param {string} subscriptionData.cardInfo.cardholderName - Nom du titulaire
   * @returns {Promise<Object>} - Résultat du processus complet
   */
  async executeSubscriptionProcess(subscriptionData) {
    const processLog = [];
    let sessionId = null;

    try {
      console.log("\n🚀 Démarrage du processus d'abonnement Netflix\n");
      console.log(`👤 UserId: ${subscriptionData.userId}`);
      console.log(`🏷️ PlanActivationId: ${subscriptionData.planActivationId}`);
      console.log(`📦 Plan sélectionné: ${subscriptionData.typeDePlan}`);
      console.log(`📧 Email: ${subscriptionData.email}\n`);

      // Étape 1: Démarrer la session
      const step1Result = await step1_startSession(this.baseUrl);
      processLog.push({ step: 1, name: "startSession", result: step1Result });

      if (!step1Result.success) {
        throw new Error(`Échec étape 1: ${step1Result.error}`);
      }

      sessionId = step1Result.sessionId;
      console.log("");

      // Étape 2: Naviguer vers la sélection du plan (avec retry de session si échec)
      let step2Result = await step2_navigateToPlanSelection(
        this.baseUrl,
        sessionId,
        subscriptionData.planActivationId,
        subscriptionData.userId,
        subscriptionData // Passer tout le contexte pour les erreurs
      );
      processLog.push({
        step: 2,
        name: "navigateToPlanSelection",
        result: step2Result,
        attempt: 1,
      });

      // Si l'étape 2 échoue, on tente un retry complet de session
      if (!step2Result.success) {
        console.log(
          "\n🔄 Étape 2 échouée - Tentative de retry avec nouvelle session..."
        );

        // Sauvegarder l'ID de la session qui a échoué pour traçabilité
        const previousSessionId = sessionId;
        console.log(`📝 Session échouée: ${previousSessionId}`);

        // Fermer la session actuelle
        console.log("🔒 Fermeture de la session actuelle...");
        try {
          await this.closeSession(sessionId);
        } catch (closeError) {
          console.error(`⚠️ Erreur fermeture session: ${closeError.message}`);
        }

        // Relancer une nouvelle session (Retry Étape 1)
        console.log("🆕 Redémarrage d'une nouvelle session...");
        const step1RetryResult = await step1_startSession(this.baseUrl);
        processLog.push({
          step: 1,
          name: "startSession (retry)",
          result: step1RetryResult,
          attempt: 2,
        });

        if (!step1RetryResult.success) {
          throw new Error(
            `Échec redémarrage session: ${step1RetryResult.error}`
          );
        }

        sessionId = step1RetryResult.sessionId;
        console.log(`✅ Nouvelle session créée: ${sessionId}`);
        console.log(
          `🔗 Cette session est un retry de la session: ${previousSessionId}\n`
        );

        // Enrichir subscriptionData avec les infos de retry pour traçabilité
        const subscriptionDataWithRetry = {
          ...subscriptionData,
          isSessionRetry: true,
          previousSessionId: previousSessionId,
          sessionRetryAttempt: 2,
          retryReason: "step2_navigation_failed",
        };

        // Retenter l'étape 2 avec la nouvelle session et les infos de retry
        console.log(
          "🔄 Nouvelle tentative de l'étape 2 (avec traçabilité retry)..."
        );
        step2Result = await step2_navigateToPlanSelection(
          this.baseUrl,
          sessionId,
          subscriptionData.planActivationId,
          subscriptionData.userId,
          subscriptionDataWithRetry // Passer les données enrichies
        );
        processLog.push({
          step: 2,
          name: "navigateToPlanSelection (retry)",
          result: step2Result,
          attempt: 2,
          previousSessionId: previousSessionId,
        });

        // Si ça échoue encore après le retry de session, on lance l'erreur
        if (!step2Result.success) {
          console.log("❌ Étape 2 échouée même après retry de session");
          console.log(
            `📊 Contexte: Session initiale ${previousSessionId} -> Session retry ${sessionId}`
          );
          throw new Error(
            `Échec étape 2 (après retry session): ${step2Result.error}`
          );
        }

        console.log("✅ Étape 2 réussie après retry de session!");
        console.log(`   Session initiale: ${previousSessionId} (FAILED)`);
        console.log(`   Session retry: ${sessionId} (SUCCESS)\n`);
      }
      console.log("");

      // Étape 3: Sélectionner le plan
      const step3Result = await step3_selectPlan(
        this.baseUrl,
        sessionId,
        subscriptionData.typeDePlan,
        subscriptionData.planActivationId,
        subscriptionData.userId,
        subscriptionData // Passer tout le contexte pour les erreurs
      );
      processLog.push({ step: 3, name: "selectPlan", result: step3Result });

      if (!step3Result.success) {
        throw new Error(`Échec étape 3: ${step3Result.error}`);
      }
      console.log("");

      // Étape 4: Premier clic après sélection du plan
      const step4Result = await step4_clickAfterPlanSelection(
        this.baseUrl,
        sessionId,
        subscriptionData.planActivationId,
        subscriptionData.userId,
        subscriptionData // Passer tout le contexte pour les erreurs
      );
      processLog.push({
        step: 4,
        name: "clickAfterPlanSelection",
        result: step4Result,
      });

      if (!step4Result.success) {
        throw new Error(`Échec étape 4: ${step4Result.error}`);
      }
      console.log("");

      // Étape 5: Deuxième clic vers email/mot de passe
      const step5Result = await step5_clickToEmailPassword(
        this.baseUrl,
        sessionId,
        subscriptionData.planActivationId,
        subscriptionData.userId,
        subscriptionData // Passer tout le contexte pour les erreurs
      );
      processLog.push({
        step: 5,
        name: "clickToEmailPassword",
        result: step5Result,
      });

      if (!step5Result.success) {
        throw new Error(`Échec étape 5: ${step5Result.error}`);
      }
      console.log("");

      // Étape 6: Remplir email et mot de passe
      const step6Result = await step6_fillEmailPassword(
        this.baseUrl,
        sessionId,
        subscriptionData.planActivationId,
        subscriptionData.userId,
        subscriptionData
      );
      processLog.push({
        step: 6,
        name: "fillEmailPassword",
        result: step6Result,
      });

      if (!step6Result.success) {
        throw new Error(`Échec étape 6: ${step6Result.error}`);
      }
      console.log("");

      // Étape 7: Clic vers la sélection de méthode de paiement
      const step7Result = await step7_clickToPaymentMethod(
        this.baseUrl,
        sessionId,
        subscriptionData.planActivationId,
        subscriptionData.userId,
        subscriptionData // Passer tout le contexte pour les erreurs
      );
      processLog.push({
        step: 7,
        name: "clickToPaymentMethod",
        result: step7Result,
      });

      if (!step7Result.success) {
        throw new Error(`Échec étape 7: ${step7Result.error}`);
      }
      console.log("");

      // Étape 8: Sélectionner la méthode de paiement
      const step8Result = await step8_selectPaymentMethod(
        this.baseUrl,
        sessionId,
        subscriptionData.planActivationId,
        subscriptionData.userId,
        subscriptionData // Passer tout le contexte pour les erreurs
      );
      processLog.push({
        step: 8,
        name: "selectPaymentMethod",
        result: step8Result,
      });

      if (!step8Result.success) {
        throw new Error(`Échec étape 8: ${step8Result.error}`);
      }
      console.log("");

      // Étape 9: Remplir le formulaire de paiement
      const step9Result = await step9_fillPaymentForm(
        this.baseUrl,
        sessionId,
        subscriptionData.planActivationId,
        subscriptionData.userId,
        subscriptionData
      );
      processLog.push({
        step: 9,
        name: "fillPaymentForm",
        result: step9Result,
      });

      if (!step9Result.success) {
        throw new Error(`Échec étape 9: ${step9Result.error}`);
      }
      console.log("");

      // Étape 10: Clic final sur le bouton de paiement
      const step10Result = await step10_submitPayment(
        this.baseUrl,
        sessionId,
        subscriptionData.planActivationId,
        subscriptionData.userId,
        subscriptionData // Passer tout le contexte pour les erreurs
      );
      processLog.push({
        step: 10,
        name: "submitPayment",
        result: step10Result,
      });

      if (!step10Result.success) {
        throw new Error(`Échec étape 10: ${step10Result.error}`);
      }
      console.log("");

      console.log("🎉 Processus d'abonnement terminé avec succès!\n");

      // Fermer la session après succès
      console.log("🔒 Fermeture de la session après succès...");
      await this.closeSession(sessionId);

      return {
        success: true,
        message: "Processus d'abonnement Netflix terminé avec succès",
        sessionId,
        processLog,
        completedSteps: 10,
      };
    } catch (error) {
      console.error(
        `\n💥 Erreur dans le processus d'abonnement: ${error.message}\n`
      );

      // Fermer la session après erreur
      if (sessionId) {
        console.log("🔒 Fermeture de la session après erreur...");
        try {
          await this.closeSession(sessionId);
        } catch (closeError) {
          console.error(
            `⚠️ Erreur lors de la fermeture de session: ${closeError.message}`
          );
        }
      }

      return {
        success: false,
        error: error.message,
        sessionId,
        processLog,
        completedSteps: processLog.length,
        failedAt:
          processLog.length > 0
            ? processLog[processLog.length - 1].name
            : "initialization",
      };
    }
  }

  /**
   * Fermer une session Netflix
   * @param {string} sessionId - ID de la session à fermer
   * @returns {Promise<void>}
   */
  async closeSession(sessionId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/netflix/session/close`,
        {
          sessionId,
        }
      );

      if (response.data.success) {
        console.log(`✅ Session ${sessionId} fermée avec succès`);
      } else {
        console.log(`⚠️ Échec fermeture session: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`❌ Erreur fermeture session: ${error.message}`);
    }
  }

  /**
   * Obtenir un résumé du processus
   * @param {Array} processLog - Log du processus
   * @returns {Object} - Résumé formaté
   */
  getProcessSummary(processLog) {
    const summary = {
      totalSteps: processLog.length,
      successful: processLog.filter((s) => s.result.success).length,
      failed: processLog.filter((s) => !s.result.success).length,
      steps: processLog.map((s) => ({
        step: s.step,
        name: s.name,
        success: s.result.success,
        error: s.result.error || null,
      })),
    };

    return summary;
  }
}

module.exports = SubscriptionOrchestrator;
