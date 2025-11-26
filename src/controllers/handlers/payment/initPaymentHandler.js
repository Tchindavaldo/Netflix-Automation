const socketModule = require('../../../../socket');
const planActivationService = require('../../../services/planActivationService');
const axios = require('axios');
const netflixPricing = require('../../../../config/netflix-pricing.json');

/**
 * Gestionnaire pour initialiser un paiement Orange Money
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const initPaymentHandler = async (req, res) => {
  try {
    const { userId, numeroOM, email, motDePasse, typeDePlan } = req.body;

    // Déterminer le montant : utiliser celui fourni OU celui du pricing config
    let amount = req.body.amount;
    if (!amount) {
      // Récupérer le montant depuis la config selon le type de plan
      const planPricing = netflixPricing.pricing[typeDePlan.toLowerCase()];
      if (planPricing) {
        amount = planPricing.amount;
        // console.log(`💰 Montant automatique selon le plan ${typeDePlan}: ${amount} ${planPricing.currency}`);
      } else {
        return res.status(400).json({
          success: false,
          message: `Type de plan inconnu: ${typeDePlan}. Plans disponibles: ${Object.keys(netflixPricing.pricing).join(', ')}`
        });
      }
    }

    // Validation des paramètres avec détection précise des manquants
    const requiredParams = ['userId', 'numeroOM', 'email', 'motDePasse', 'typeDePlan'];
    const missingParams = [];
    
    requiredParams.forEach(param => {
      if (!req.body[param]) {
        missingParams.push(param);
      }
    });

    if (missingParams.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Paramètres manquants: ${missingParams.join(', ')}`,
        missingParameters: missingParams,
        requiredParameters: requiredParams
      });
    }

    // console.log(`🔵 Initialisation du paiement Orange Money pour ${email} (userId: ${userId})...`);
    // console.log(`📱 Numéro OM: ${numeroOM}`);
    // console.log(`📦 Type de plan: ${typeDePlan}`);
    // console.log(`💵 Montant: ${amount}`);

    // ÉTAPE 1: Créer le planActivation avec reqteStatusSuccess='pending'
    // console.log(`📝 Étape 1: Création du planActivation...`);
    
    const activationData = {
      userId,
      planNetflix: typeDePlan,
      amount: parseFloat(amount),
      statut: 'pending',
      reqteStatusSuccess: 'pending', // String: 'pending' au départ
      numeroOM,
      email,
      motDePasse,  // 🔐 Ajout du mot de passe
      isPaiementCardActive: true,  // 💳 Carte de paiement active par défaut
      typePaiement: 'orange_money',
      dureeActivation: 29,
      dateCreation: new Date().toISOString(),
      dateModification: new Date().toISOString()
    };

    const newActivation = await planActivationService.createActivation(activationData);
    const planActivationId = newActivation.id;
    
    // console.log(`✅ PlanActivation créé avec l'ID: ${planActivationId}`);
    
    // Émettre l'événement Socket.IO pour la création
    try {
      const io = socketModule.getIO();
      io.to(userId).emit('activationcreated', {
        success: true,
        message: 'Activation créée avec succès',
        data: newActivation,
        timestamp: new Date().toISOString(),
      });
      // console.log(`🔔 Socket.IO: Activation créée envoyée à ${userId}`);
    } catch (socketError) {
      console.error('❌ Erreur lors de l\'\u00e9mission Socket.IO:', socketError);
    }

    // Simuler le traitement du paiement Orange Money (remplacer par vraie logique API)
    // Répondre immédiatement avec le planActivationId
    res.status(200).json({
      success: true,
      message: 'Paiement initié et planActivation créé',
      data: {
        userId,
        planActivationId,
        numeroOM,
        email,
        typeDePlan,
        amount,
        timestamp: new Date().toISOString(),
      },
    });

    // console.log(`✅ Paiement initié pour ${email} (userId: ${userId})`);

    // ÉTAPE 2: Simuler validation du paiement puis appeler init_subscription_process
    setTimeout(async () => {
      try {
        const io = socketModule.getIO();
        
        // Émettre l'événement de validation du paiement
        io.to(userId).emit('payment_validated', {
          success: true,
          message: 'Paiement validé par Orange Money',
          data: {
            userId,
            planActivationId,
            numeroOM,
            email,
            typeDePlan,
            timestamp: new Date().toISOString(),
          },
        });

        // console.log(`🔔 Socket.IO: Paiement validé envoyé à ${userId}`);

        // ÉTAPE 3: Appeler l'orchestrateur d'abonnement Netflix
        // console.log(`🎬 Étape 2: Appel de l'orchestrateur d'abonnement Netflix...`);
        
        const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        
        try {
          const subscriptionResponse = await axios.post(`${baseUrl}/api/subscription/init`, {
            typeDePlan,
            email,
            motDePasse,
            planActivationId,
            userId // Ajouter userId pour traçabilité
          });

          // ÉTAPE 4: Si succès, mettre à jour le planActivation
          if (subscriptionResponse.data.success) {
            // console.log(`✅ Processus d'abonnement réussi pour ${email} (userId: ${userId})`);
            
            // Mettre reqteStatusSuccess='success' et statut='activated'
            await planActivationService.updateActivation(planActivationId, {
              reqteStatusSuccess: 'success',
              dateModification: new Date().toISOString()
            });
            
            // Changer le statut à 'activated' (cela déclenchera les dates automatiquement)
            const statusChangeResponse = await axios.put(
              `${baseUrl}/api/plan-activation/${planActivationId}/status`,
              { statut: 'activated' }
            );
            
            // console.log(`✅ PlanActivation mis à jour: reqteStatusSuccess='success', statut='activated'`);
            
            // Notifier le succès
            io.to(userId).emit('subscription_success', {
              success: true,
              message: 'Abonnement Netflix activé avec succès',
              data: {
                userId,
                planActivationId,
                activation: statusChangeResponse.data.data,
                timestamp: new Date().toISOString(),
              },
            });
            
          } else {
            // ÉTAPE 5: Si échec, mettre reqteStatusSuccess='failed' SANS changer le statut
            console.error(`❌ Échec du processus d'abonnement pour ${email} (userId: ${userId}):`, subscriptionResponse.data.message);
            
            await planActivationService.updateActivation(planActivationId, {
              reqteStatusSuccess: 'failed',
              dateModification: new Date().toISOString()
            });
            
            // console.log(`⚠️ PlanActivation mis à jour: reqteStatusSuccess='failed', statut reste 'pending'`);
            
            // Notifier l'échec
            io.to(userId).emit('subscription_error', {
              success: false,
              message: 'Erreur lors de l\'activation de l\'abonnement Netflix',
              error: subscriptionResponse.data.message,
              data: {
                userId,
                planActivationId,
                timestamp: new Date().toISOString(),
              },
            });
          }
          
        } catch (subscriptionError) {
          // Erreur lors de l'appel à l'orchestrateur
          console.error(`❌ Erreur lors de l'appel à l'orchestrateur d'abonnement (userId: ${userId}):`, subscriptionError.message);
          
          await planActivationService.updateActivation(planActivationId, {
            reqteStatusSuccess: 'failed',
            dateModification: new Date().toISOString()
          });
          
          // console.log(`⚠️ PlanActivation mis à jour: reqteStatusSuccess='failed' après erreur`);
          
          // Notifier l'erreur
          io.to(userId).emit('subscription_error', {
            success: false,
            message: 'Erreur technique lors de l\'activation',
            error: subscriptionError.message,
            data: {
              userId,
              planActivationId,
              timestamp: new Date().toISOString(),
            },
          });
        }
        
      } catch (error) {
        console.error('❌ Erreur lors du traitement post-paiement (userId: ${userId}):', error);
      }
    }, 10000); // 10 secondes après la réponse initiale

  } catch (error) {
    console.error('❌ Erreur dans le gestionnaire initPayment:', error);
    
    // Si la réponse n'a pas encore été envoyée
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'initialisation du paiement',
        error: error.toString(),
      });
    }
  }
};

module.exports = initPaymentHandler;
