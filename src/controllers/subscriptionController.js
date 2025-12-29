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
        userId,
        backendRegion
      } = req.body;

      // Définir la région backend par défaut si non fournie
      const region = backendRegion || 'basic';

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

      // Vérifier si l'orchestration est activée (par défaut: false)
      // Si false, on saute toute l'automatisation et on met en attente
      const useOrchestration = req.body.useOrchestration === true; // Strictement true pour activer

      console.log(`📥 SubscriptionController: Requête reçue pour ${email}`);
      console.log(`   - Region: ${region}`);
      console.log(`   - UseOrchestration: ${useOrchestration}`);

      if (!useOrchestration) {
        console.log(`⏸️ Orchestration désactivée. Renvoi immédiat.`);
        return res.status(200).json({
          success: true,
          message: `Orchestration désactivée. Demande de paiement mise en attente.`,
          automationSkipped: true,
          reason: `Orchestration désactivée (useOrchestration: false)`,
          data: {
            planActivationId,
            userId,
            typeDePlan,
            region,
            status: 'pending',
            requiresManualProcessing: true
          }
        });
      }

      // Charger les informations de carte depuis le fichier de configuration
      const cardInfo = subscriptionData.cardInfo;

      // Valider le type de plan selon la région backend
      const selectors = require('../../selectors/subscription-selectors.json');
      const regionPlans = selectors.planSelection.backendRegions[region];
      
      if (!regionPlans) {
        return res.status(400).json({
          success: false,
          message: `Région backend invalide: ${region}. Régions disponibles: ${Object.keys(selectors.planSelection.backendRegions).join(', ')}`,
          receivedRegion: region
        });
      }

      const validPlans = Object.keys(regionPlans);
      if (!validPlans.includes(typeDePlan.toLowerCase())) {
        // Le plan n'existe pas dans cette région
        // On ne lance PAS l'orchestration, juste retourner un succès avec statut "pending"
        return res.status(200).json({
          success: true,
          message: `Plan ${typeDePlan} non disponible dans la région ${region}. Demande de paiement créée en attente.`,
          automationSkipped: true,
          reason: `Le plan ${typeDePlan} n'existe pas dans la région ${region}`,
          data: {
            planActivationId,
            userId,
            typeDePlan,
            region,
            status: 'pending',
            requiresManualProcessing: true
          }
        });
      }

      // console.log(`🎯 Initialisation du processus d'abonnement pour ${email} (userId: ${userId})...`);

      // Créer l'orchestrateur et exécuter le processus
      const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const orchestrator = new SubscriptionOrchestrator(baseUrl);

      const result = await orchestrator.executeSubscriptionProcess({
        typeDePlan,
        email,
        motDePasse,
        planActivationId,
        userId,
        cardInfo,
        backendRegion: region
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
      // console.error('❌ Erreur dans le contrôleur d\'abonnement:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors du processus d\'abonnement',
        error: error.toString()
      });
    }
  }
};

module.exports = subscriptionController;
