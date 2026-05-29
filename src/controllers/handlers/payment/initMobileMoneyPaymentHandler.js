const axios = require('axios');
const planActivationService = require('../../../services/planActivationService');
const transactionService = require('../../../services/transactionService');

/**
 * Handler to initiate a Mobile Money payment via the new external endpoint.
 * @param {Object} req - HTTP Request
 * @param {Object} res - HTTP Response
 */
const initMobileMoneyPaymentHandler = async (req, res) => {
  try {
    const { userId, email, phone, amount, reason, senderName, country, typeDePlan, motDePasse, backendRegion } = req.body;

    // Validate required parameters
    if (!userId || !email || !amount || !typeDePlan) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: userId, email, amount, typeDePlan are required.'
      });
    }

    const paymentUserId = process.env.PAYMENT_USER_ID;
    const secretKey = process.env.PAYMENT_SECRET_KEY; 
    const externalApiUrl = process.env.PAYMENT_API_URL;

    // Sanitize phone number (remove +237 or 237 if present)
    let sanitizedPhone = phone || '696080087';
    sanitizedPhone = sanitizedPhone.replace(/^\+?237/, '');

    const payload = {
      estimation: parseFloat(amount), // Ensure it's a number
      raisonForTransfer: reason || 'netflix-paiment',
      userEmail: email,
      userPhone: sanitizedPhone,
      userCountry: country || 'Cameroon',
      senderName: senderName || 'moobilpay',
      callbackUrl: process.env.PAYMENT_WEBHOOK_URL || undefined,
    };

    // Create Plan Activation
    const activationData = {
      userId,
      planNetflix: typeDePlan,
      amount: parseFloat(amount),
      statut: 'pending',
      reqteStatusSuccess: 'pending',
      numeroOM: phone || 'N/A',
      email,
      motDePasse: motDePasse || 'N/A',
      backendRegion: backendRegion || 'basic',
      isPaiementCardActive: false,
      typePaiement: 'mobile_money',
      dureeActivation: 29,
      dateCreation: new Date().toISOString(),
      dateModification: new Date().toISOString()
    };

    const newActivation = await planActivationService.createActivation(activationData);
    const planActivationId = newActivation.id;

    // --- MODE REVIEW APPLE : on saute le paiement réel (validation App Store) ---
    // Piloté par la variable d'env APPLE_REVIEW_MODE. Aucune passerelle externe
    // n'est appelée : on renvoie un transactionId factice + le flag skipPayment
    // pour que le frontend saute le webview et passe direct à l'activation.
    // ⚠️ Temporaire : à désactiver après validation Apple.
    if (process.env.APPLE_REVIEW_MODE === 'true') {
      const fakeTransactionId = `APPLE_REVIEW_${Date.now()}`;
      console.log(`🍏 [APPLE-REVIEW] Paiement sauté. Tx factice: ${fakeTransactionId}`);

      try {
        await transactionService.createTransaction({
          userId,
          planActivationId,
          externalTransactionId: fakeTransactionId,
          amount: parseFloat(amount),
          type: 'mobile_money',
          status: 'success',
          planType: typeDePlan
        });
      } catch (err) {
        console.error('❌ [APPLE-REVIEW] Échec enregistrement transaction:', err.message);
      }

      return res.status(200).json({
        success: true,
        skipPayment: true,
        transactionId: fakeTransactionId,
        paymentLink: '',
        planActivationId
      });
    }

    console.log('Initiating Mobile Money payment with payload:', payload);
    console.log('External API URL:', externalApiUrl);

    const response = await axios.post(externalApiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': paymentUserId,
        'x-secret-key': secretKey
      },
      timeout: 30000, // 30 seconds timeout
      family: 4 // Force IPv4
    });

    console.log('External API Response Status:', response.status);
    console.log('External API Response Data:', JSON.stringify(response.data, null, 2));

    // Nouveau format Digikuntz: { id, status, data: { paymentLink, ... } }
    const transactionId = response.data.id || response.data.transactionId;
    const paymentLink = response.data.data?.paymentLink || response.data.paymentLink;

    if (!transactionId || !paymentLink) {
      console.error('Missing id or paymentLink in response:', response.data);
      throw new Error('Invalid response from payment provider: ' + JSON.stringify(response.data));
    }

    // Enregistrer la transaction en statut PENDING
    try {
      await transactionService.createTransaction({
        userId,
        planActivationId,
        externalTransactionId: transactionId,
        amount: parseFloat(amount),
        type: 'mobile_money',
        status: 'pending',
        planType: typeDePlan
      });
      console.log(`📝 [TRANSACTION] Enregistrée comme PENDING pour Tx: ${transactionId}`);
    } catch (err) {
      console.error('❌ [TRANSACTION-ERROR] Échec enregistrement pending:', err.message);
    }

    return res.status(200).json({
      success: true,
      transactionId,
      paymentLink,
      planActivationId // Return the ID
    });

  } catch (error) {
    console.error('❌ [PAYMENT-INIT-ERROR] Erreur:', error.message);
    if (error.code) console.error('🔍 [ERROR-CODE]:', error.code);
    
    if (error.response) {
      console.error('❌ [PROVIDER-RESPONSE] Détails:', JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status).json({
        success: false,
        message: 'Payment provider error',
        error: error.response.data
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error during payment initiation',
      error: error.message,
      code: error.code
    });
  }
};

module.exports = initMobileMoneyPaymentHandler;
