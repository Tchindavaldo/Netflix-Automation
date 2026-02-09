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
    const { userId, numeroOM, email, motDePasse, typeDePlan, backendRegion, useOrchestration } = req.body;

    // Définir la région backend par défaut si non fournie
    const region = backendRegion || 'basic';

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

    // --- NOUVEAU: Appel à l'API externe pour obtenir le lien de paiement ---
    const paymentUserId = process.env.PAYMENT_USER_ID;
    const secretKey = process.env.PAYMENT_SECRET_KEY; 
    const externalApiUrl = process.env.PAYMENT_API_URL;

    // Nettoyer le numéro de téléphone
    let sanitizedPhone = numeroOM.replace(/^\+?237/, '');

    const payload = {
      estimation: parseFloat(amount),
      raisonForTransfer: 'netflix-paiment',
      userEmail: email,
      userPhone: sanitizedPhone,
      userCountry: 'Cameroon',
      senderName: 'moobilpay'
    };

    // console.log('Initiating external payment with payload:', payload);
    const externalResponse = await axios.post(externalApiUrl, payload, {
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': paymentUserId,
        'x-secret-key': secretKey
      }
    });

    const transactionId = externalResponse.data.transactionId || externalResponse.data.id;
    const { paymentLink } = externalResponse.data;

    if (!transactionId || !paymentLink) {
      throw new Error('Réponse invalide du fournisseur de paiement');
    }

    // Répondre avec les informations nécessaires pour la 2ème requête du frontend
    res.status(200).json({
      success: true,
      message: 'Paiement initié avec succès',
      transactionId,
      paymentLink,
      data: {
        userId,
        numeroOM,
        email,
        typeDePlan,
        amount,
        timestamp: new Date().toISOString(),
      },
    });

    // console.log(`✅ Paiement initié pour ${email} (userId: ${userId})`);
    // L'ÉTAPE 2 (setTimeout) a été supprimée car la vérification est maintenant gérée par le frontend via un second appel.

  } catch (error) {
    // console.error('❌ Erreur dans le gestionnaire initPayment:', error);
    
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
