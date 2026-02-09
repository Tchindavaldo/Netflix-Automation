const SubscriptionOrchestrator = require('../services/subscription/subscriptionOrchestrator');
const axios = require('axios');
const subscriptionData = require('../../config/subscription-data.json');

// Map to track active subscription verification requests
const activeRequests = new Map();

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
        backendRegion,
        transactionId // Nouveau paramètre optionnel
      } = req.body;

      // Définir la région backend par défaut si non fournie
      const region = backendRegion || 'basic';

      // Validation des paramètres obligatoires avec détection précise des manquants
      // planActivationId est désormais optionnel si on utilise une transaction externe
      const requiredFields = ['typeDePlan', 'email', 'motDePasse', 'userId'];
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

      // Variable pour stocker l'ID de l'activation (soit fourni, soit créé après paiement)
      let finalPlanActivationId = planActivationId;

      // --- 1. VÉRIFICATION DE LA TRANSACTION (SI FOURNIE) ---
      if (transactionId) {
        // console.log(`🔍 Vérification de la transaction ${transactionId}...`);
        const paymentUserId = process.env.PAYMENT_USER_ID;
        const secretKey = process.env.PAYMENT_SECRET_KEY;
        const verifyUrl = process.env.PAYMENT_API_URL;
        
        const PAYMENT_POLLING_INTERVAL_MS = 5000;
        const PAYMENT_TIMEOUT_MINUTES = 15;
        const maxAttempts = (PAYMENT_TIMEOUT_MINUTES * 60 * 1000) / PAYMENT_POLLING_INTERVAL_MS;
        let attempts = 0;
        let transactionVerified = false;

        activeRequests.set(transactionId, { cancelled: false });

        while (!transactionVerified && attempts < maxAttempts) {
          const requestStatus = activeRequests.get(transactionId);
          if (requestStatus && requestStatus.cancelled) {
            activeRequests.delete(transactionId);
            return res.status(200).json({ success: false, message: 'Vérification annulée.', cancelled: true });
          }

          try {
            const verifyResponse = await axios({
              method: 'get',
              url: verifyUrl,
              params: { transactionId },
              headers: { 
                'Content-Type': 'application/json',
                'x-user-id': paymentUserId,
                'x-secret-key': secretKey
              }
            });
            const { status } = verifyResponse.data;
            // console.log(`   - Statut transaction: ${status}`);

            if (status === 'error' || status === 'failed' || status === 'cancelled') {
              activeRequests.delete(transactionId);
              return res.status(400).json({ success: false, message: 'Le paiement a échoué.', error: verifyResponse.data });
            }

            if (status === 'success' || status === 'completed') {
               transactionVerified = true;
               // console.log(`✅ Paiement confirmé pour la transaction ${transactionId}`);
               
               // Émettre immédiatement le signal de validation du paiement
                try {
                  const io = require('../../socket').getIO();
                  // console.log(`📡 Émission 'payment_validated' vers l'utilisateur: ${userId}`);
                  
                  io.to(userId).emit('payment_validated', {
                    success: true,
                    message: 'Paiement validé avec succès !',
                    data: { userId, transactionId }
                  });
                  // console.log(`✅ Événement 'payment_validated' envoyé à la room ${userId}`);
                } catch (e) {
                  console.error('❌ Erreur lors de l\'émission socket (polling):', e.message);
                }
            } else {
              attempts++;
              await new Promise(resolve => setTimeout(resolve, PAYMENT_POLLING_INTERVAL_MS));
            }
          } catch (err) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, PAYMENT_POLLING_INTERVAL_MS));
          }
        }

        activeRequests.delete(transactionId);
        if (!transactionVerified) {
             return res.status(400).json({ success: false, message: 'Délai de vérification dépassé.' });
        }
      }

      // --- 2. CRÉATION DE L'ACTIVATION (SI PAS DÉJÀ EXISTANTE) ---
      // On ne crée l'activation que si on a soit un planActivationId existant, soit une transaction validée
      if (!finalPlanActivationId) {
        if (!transactionId) {
          return res.status(400).json({ success: false, message: 'planActivationId ou transactionId requis.' });
        }

        // console.log('📝 Création du planActivation après succès du paiement...');
        const planActivationService = require('../services/planActivationService');
        const activationData = {
          userId,
          planNetflix: typeDePlan,
          amount: parseFloat(req.body.amount || 0),
          statut: 'pending',
          reqteStatusSuccess: 'pending',
          numeroOM: req.body.numeroOM || 'N/A',
          email,
          motDePasse,
          backendRegion: region,
          isPaiementCardActive: true,
          typePaiement: 'orange_money',
          dureeActivation: 29,
          dateCreation: new Date().toISOString(),
          dateModification: new Date().toISOString()
        };

        const newActivation = await planActivationService.createActivation(activationData);
        finalPlanActivationId = newActivation.id;
        // console.log(`✅ PlanActivation créé: ${finalPlanActivationId}`);

        // Notification Socket
        try {
          const io = require('../../socket').getIO();
          
          // Informer que l'activation est créée (pour le store) avec un délai de 3s
          setTimeout(() => {
            io.to(userId).emit('activationcreated', {
              success: true,
              data: newActivation
            });
            // console.log(`✅ Événement 'activationcreated' envoyé après 3s`);
          }, 5000);
        } catch (e) {
          console.error('❌ Erreur lors de l\'émission socket (creation):', e.message);
        }
      }

      // --- 3. VÉRIFICATION DES CONDITIONS D'ORCHESTRATION ---
      const useOrchestration = req.body.useOrchestration === true;
      if (!useOrchestration) {
        try {
          const io = require('../../socket').getIO();
          io.to(userId).emit('automation_skipped', {
            success: true,
            message: 'Paiement validé. Orchestration désactivée.',
            data: { planActivationId: finalPlanActivationId, userId }
          });
        } catch (e) {}

        return res.status(200).json({
          success: true,
          message: `Paiement validé. Orchestration désactivée.`,
          automationSkipped: true,
          data: { planActivationId: finalPlanActivationId, userId, status: 'pending' }
        });
      }

      const selectors = require('../../selectors/subscription-selectors.json');
      const regionPlans = selectors.planSelection.backendRegions[region];
      if (!regionPlans || !Object.keys(regionPlans).includes(typeDePlan.toLowerCase())) {
        try {
          const io = require('../../socket').getIO();
          io.to(userId).emit('automation_skipped', {
            success: true,
            message: 'Plan non disponible pour automatisation dans cette région.',
            data: { planActivationId: finalPlanActivationId, userId }
          });
        } catch (e) {}

        return res.status(200).json({
          success: true,
          message: `Plan non disponible pour automatisation dans cette région.`,
          automationSkipped: true,
          data: { planActivationId: finalPlanActivationId, userId, status: 'pending' }
        });
      }

      // --- 4. LANCEMENT DU ROBOT NETFLIX ---
      console.log(`🎯 Lancement du robot pour l'activation ${finalPlanActivationId}`);
      const cardInfo = subscriptionData.cardInfo;
      const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const orchestrator = new SubscriptionOrchestrator(baseUrl);

      const result = await orchestrator.executeSubscriptionProcess({
        typeDePlan,
        email,
        motDePasse,
        planActivationId: finalPlanActivationId,
        userId,
        cardInfo,
        backendRegion: region
      });

      if (result.success) {
        // Récupérer l'activation mise à jour pour l'envoyer via socket
        const planActivationService = require('../services/planActivationService');
        const updatedActivation = await planActivationService.getActivationById(finalPlanActivationId);

        try {
          const io = require('../../socket').getIO();
          io.to(userId).emit('subscription_success', {
            success: true,
            message: 'Abonnement Netflix activé avec succès',
            data: {
              userId,
              planActivationId: finalPlanActivationId,
              activation: updatedActivation
            }
          });
        } catch (e) {}

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
        try {
          const io = require('../../socket').getIO();
          io.to(userId).emit('subscription_error', {
            success: false,
            message: 'Erreur lors de l\'activation de l\'abonnement Netflix',
            error: result.error,
            data: {
              userId,
              planActivationId: finalPlanActivationId
            }
          });
        } catch (e) {}

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
  },

  /**
   * Annuler la vérification d'un paiement en cours
   */
  cancelPaymentVerification: async (req, res) => {
    try {
      const { transactionId } = req.body;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          message: 'Transaction ID requis pour l\'annulation'
        });
      }

      const requestStatus = activeRequests.get(transactionId);
      
      if (requestStatus) {
        // Mark as cancelled
        requestStatus.cancelled = true;
        // console.log('✅ Transaction marquée pour annulation:', transactionId);
        
        return res.status(200).json({
          success: true,
          message: 'Demande d\'annulation enregistrée'
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Aucune vérification active trouvée pour cette transaction'
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'annulation:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'annulation',
        error: error.toString()
      });
    }
  }
};

module.exports = subscriptionController;
