const SubscriptionOrchestrator = require('../services/subscription/subscriptionOrchestrator');
const subscriptionData = require('../../config/subscription-data.json');

/**
 * Contrôleur pour la gestion du processus d'abonnement Netflix
 */
const subscriptionController = {
  /**
   * Initialiser le processus d'abonnement Netflix complet
   */
  initSubscriptionProcess: async (req, res) => {
    try {
      const {
        typeDePlan,
        email,
        motDePasse,
        planActivationId,
        userId
      } = req.body;

      // Validation des paramètres obligatoires avec détection précise des manquants
      const requiredFields = ['typeDePlan', 'email', 'motDePasse', 'planActivationId', 'userId'];
      const missingFields = [];
      
      requiredFields.forEach(field => {
        if (!req.body[field]) {
          missingFields.push(field);
        }
      });

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Paramètres manquants: ${missingFields.join(', ')}`,
          missingFields: missingFields,
          requiredFields: requiredFields
        });
      }

      // Charger les informations de carte depuis le fichier de configuration
      const cardInfo = subscriptionData.cardInfo;

      // Valider le type de plan
      const validPlans = ['mobile', 'basic', 'standard', 'premium'];
      if (!validPlans.includes(typeDePlan.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Type de plan invalide. Plans acceptés: ${validPlans.join(', ')}`,
          receivedPlan: typeDePlan
        });
      }

      console.log(`🎯 Initialisation du processus d'abonnement pour ${email} (userId: ${userId})...`);

      // Créer l'orchestrateur et exécuter le processus
      const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const orchestrator = new SubscriptionOrchestrator(baseUrl);

      const result = await orchestrator.executeSubscriptionProcess({
        typeDePlan,
        email,
        motDePasse,
        planActivationId,
        userId,
        cardInfo
      });

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          data: {
            sessionId: result.sessionId,
            completedSteps: result.completedSteps,
            summary: orchestrator.getProcessSummary(result.processLog)
          },
          processLog: result.processLog
        });
      } else {
        return res.status(500).json({
          success: false,
          message: result.error,
          data: {
            sessionId: result.sessionId,
            completedSteps: result.completedSteps,
            failedAt: result.failedAt,
            summary: orchestrator.getProcessSummary(result.processLog)
          },
          processLog: result.processLog
        });
      }

    } catch (error) {
      console.error('❌ Erreur dans le contrôleur d\'abonnement:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors du processus d\'abonnement',
        error: error.toString()
      });
    }
  }
};

module.exports = subscriptionController;
