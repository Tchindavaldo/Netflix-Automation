const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const SubscriptionOrchestrator = require('../services/subscription/subscriptionOrchestrator');
const axios = require('axios');
const subscriptionData = require('../../config/subscription-data.json');
const transactionService = require('../services/transactionService');
const paymentRegistry = require('../services/payment/paymentEventRegistry');

// Registre partagé avec le webhook (permet l'annulation du polling à la réception)
const { activeRequests } = paymentRegistry;

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
        console.log(`\n🔍 [POLLING] DÉBUT: Vérification de la transaction ${transactionId}...`);
        const paymentUserId = process.env.PAYMENT_USER_ID;
        const secretKey = process.env.PAYMENT_SECRET_KEY;
        const verifyUrl = process.env.PAYMENT_API_URL;
        
        const PAYMENT_POLLING_INTERVAL_MS = 2000;
        const PAYMENT_TIMEOUT_MINUTES = parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '30');
        const maxAttempts = (PAYMENT_TIMEOUT_MINUTES * 60 * 1000) / PAYMENT_POLLING_INTERVAL_MS;
        let attempts = 0;
        let transactionVerified = false;

        activeRequests.set(transactionId, { cancelled: false });

        while (!transactionVerified && attempts < maxAttempts) {
          const requestStatus = activeRequests.get(transactionId);
          if (requestStatus && requestStatus.cancelled) {
            console.log(`⚠️ [POLLING] ANNULÉ: Transaction ${transactionId} (par l'utilisateur)`);
            activeRequests.delete(transactionId);
            return res.status(200).json({ success: false, message: 'Vérification annulée.', cancelled: true });
          }

          try {
            if (attempts % 5 === 0) { // Log tous les 10 secondes pour éviter de spammer
              console.log(`⏳ [POLLING] Tentative ${attempts}/${maxAttempts} pour Tx: ${transactionId} (Attente de paiement...)`);
            }

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

            // Mapping des statuts Digikuntz (nouveau format) → statuts internes
            const STATUS_MAP = {
              payin_pending: 'pending',
              payin_success: 'success',
              payin_error: 'failed',
              payin_closed: 'cancelled',
            };
            const internalStatus = STATUS_MAP[status] || status;

            // Log si le statut change
            if (attempts === 0 || (internalStatus !== 'pending' && status !== 'pending')) {
               console.log(`📡 [POLLING-API] Statut reçu pour ${transactionId}: "${status}" → "${internalStatus}"`);
            }

            if (internalStatus === 'failed' || internalStatus === 'cancelled' || status === 'error') {
              console.log(`❌ [POLLING] ÉCHEC: Transaction ${transactionId} refusée/échouée.`);
              activeRequests.delete(transactionId);
              try { await transactionService.updateTransactionStatusByExternalId(transactionId, internalStatus === 'cancelled' ? 'cancelled' : 'failed'); } catch (e) {}
              return res.status(400).json({ success: false, message: 'Le paiement a échoué.', error: verifyResponse.data });
            }

            if (internalStatus === 'success' || status === 'completed') {
               transactionVerified = true;
               console.log(`✅ [POLLING] SUCCÈS CONFIRMÉ pour Tx: ${transactionId} (User: ${userId})`);
               
               // Mettre à jour la transaction en succès
               try { await transactionService.updateTransactionStatusByExternalId(transactionId, 'success'); } catch (e) {}

               // Émettre immédiatement le signal de validation du paiement
                try {
                  const io = require('../../socket').getIO();
                  console.log(`📡 [SOCKET] Émission 'payment_validated' vers room: ${userId}`);
                  
                  io.to(userId).emit('payment_validated', {
                    success: true,
                    message: 'Paiement validé avec succès !',
                    data: { userId, transactionId }
                  });
                } catch (e) {
                  console.error('❌ [SOCKET-ERROR] Échec émission payment_validated:', e.message);
                }
            } else {
              attempts++;
              await new Promise(resolve => setTimeout(resolve, PAYMENT_POLLING_INTERVAL_MS));
            }
          } catch (err) {
            if (attempts % 5 === 0) {
              const errorDetail = err.response ? JSON.stringify(err.response.data) : (err.code || err.message);
              console.error(`⚠️ [POLLING-ERROR] Échec réseau/API pour ${transactionId} | Détail: ${errorDetail}`);
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, PAYMENT_POLLING_INTERVAL_MS));
          }
        }
        activeRequests.delete(transactionId);
        console.log(`🏁 [POLLING] FIN: Boucle terminée pour Tx: ${transactionId}`);

        if (!transactionVerified) {
             // Marquer comme failed pour cause de timeout
             try { await transactionService.updateTransactionStatusByExternalId(transactionId, 'failed'); } catch (e) {}
             return res.status(400).json({ success: false, message: 'Délai de vérification dépassé.' });
        }
      }

      // --- 2. CRÉATION DE L'ACTIVATION (SI PAS DÉJÀ EXISTANTE) ---
      const planActivationService = require('../services/planActivationService');

      // Calcul des dates
      const dateDebut = new Date();
      const dureePlan = parseInt(process.env.DEFAULT_PLAN_DURATION || '30'); 
      const joursMarge = parseInt(process.env.DEFAULT_PLAN_MARGIN || '2'); 
      const dateFin = new Date(dateDebut);
      dateFin.setDate(dateFin.getDate() + dureePlan - joursMarge);

      // On ne crée l'activation que si on a soit un planActivationId existant, soit une transaction validée
      if (!finalPlanActivationId) {
        if (!transactionId) {
          return res.status(400).json({ success: false, message: 'planActivationId ou transactionId requis.' });
        }

        const activationData = {
          userId,
          planNetflix: typeDePlan,
          amount: parseFloat(req.body.amount || 0),
          statut: 'pending',
          reqteStatusSuccess: 'success',
          numeroOM: req.body.numeroOM || 'N/A',
          email,
          motDePasse,
          backendRegion: region,
          isPaiementCardActive: true,
          typePaiement: 'orange_money',
          dureePlan: dureePlan,
          joursMarge: joursMarge,
          dateDebut: dateDebut.toISOString(),
          dateExpiration: dateFin.toISOString(),
          dateCreation: new Date().toISOString(),
          dateModification: new Date().toISOString()
        };

        const newActivation = await planActivationService.createActivation(activationData);
        finalPlanActivationId = newActivation.id;
        console.log(`📝 [ACTIVATION] Nouvelle activation créée ID: ${finalPlanActivationId} pour User: ${userId}`);
      } else {
        // L'activation existe déjà (cas de l'app mobile), on la met à jour
        console.log(`📝 [ACTIVATION] Mise à jour de l'activation existante ID: ${finalPlanActivationId}`);
        await planActivationService.updateActivation(finalPlanActivationId, {
          reqteStatusSuccess: 'success',
          dureePlan: dureePlan,
          joursMarge: joursMarge,
          dateDebut: dateDebut.toISOString(),
          dateExpiration: dateFin.toISOString(),
          dateModification: new Date().toISOString()
        });
      }

      // --- 2.5 ENREGISTREMENT DE LA TRANSACTION ---
      try {
        await transactionService.updateTransactionStatusByExternalId(transactionId, 'success');
        console.log(`💰 [TRANSACTION] Historique mis à jour vers SUCCESS pour Tx: ${transactionId}`);
      } catch (err) {
        console.error('❌ [TRANSACTION-ERROR] Échec mise à jour transaction finale:', err.message);
      }

      // Notification Socket systématique pour passer à l'étape suivante (Reçu)
      try {
        const io = require('../../socket').getIO();
        const updatedActivation = await planActivationService.getActivationById(finalPlanActivationId);
        
        console.log(`🕒 [ACTIVATION] Programmation de l'émission 'activationcreated' vers room: ${userId}`);
        setTimeout(() => {
          console.log(`📡 [SOCKET] Émission 'activationcreated' vers room: ${userId}`);
          io.to(userId).emit('activationcreated', {
            success: true,
            data: updatedActivation || { id: finalPlanActivationId }
          });
        }, 3000);
      } catch (e) {
        console.error('❌ [SOCKET-ERROR] Échec émission activationcreated:', e.message);
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
        console.log(`🛑 [BACKEND] Annulation demandée pour Tx: ${transactionId}. Le polling s'arrêtera à la prochaine itération.`);
        
        return res.status(200).json({
          success: true,
          message: 'Demande d\'annulation enregistrée. Le processus s\'arrête.'
        });
      } else {
        console.log(`⚠️ [BACKEND] Annulation impossible : pas de polling actif trouvé pour Tx: ${transactionId}`);
        return res.status(200).json({ // 200 car l'effet voulu (arrêt) est déjà effectif
          success: true,
          message: 'Aucune vérification active (déjà terminée ou inexistante).'
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
