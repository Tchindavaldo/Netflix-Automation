const axios = require('axios');
const planActivationService = require('../../../services/planActivationService');

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

    const paymentUserId = process.env.PAYMENT_USER_ID || '6973dd008d4b9ebd7cd86b9f';
    const secretKey = process.env.PAYMENT_SECRET_KEY || 'PK-1769201488919-0221f103';
    const externalApiUrl = `https://app.digikuntz.com/dev/transaction/${paymentUserId}/SK-1769201488919-237f468b`;

    // Sanitize phone number (remove +237 or 237 if present)
    let sanitizedPhone = phone || '696080087';
    sanitizedPhone = sanitizedPhone.replace(/^\+?237/, '');

    const payload = {
      estimation: parseFloat(amount), // Ensure it's a number
      raisonForTransfer: reason || 'netflix-paiment',
      userEmail: email,
      userPhone: sanitizedPhone,
      userCountry: country || 'Cameroon',
      senderName: senderName || 'moobilpay'
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

    console.log('Initiating Mobile Money payment with payload:', payload);
    console.log('External API URL:', externalApiUrl);

    const response = await axios.post(externalApiUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('External API Response Status:', response.status);
    console.log('External API Response Data:', JSON.stringify(response.data, null, 2));

    // Map 'id' from response to 'transactionId' if 'transactionId' is missing
    const transactionId = response.data.transactionId || response.data.id;
    const { paymentLink } = response.data;

    if (!transactionId || !paymentLink) {
      console.error('Missing transactionId (or id) or paymentLink in response:', response.data);
      throw new Error('Invalid response from payment provider: ' + JSON.stringify(response.data));
    }

    return res.status(200).json({
      success: true,
      transactionId,
      paymentLink,
      planActivationId // Return the ID
    });

  } catch (error) {
    // console.error('Error initiating Mobile Money payment:', error.message);
    if (error.response) {
      // console.error('Provider response:', error.response.data);
      return res.status(error.response.status).json({
        success: false,
        message: 'Payment provider error',
        error: error.response.data
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error during payment initiation',
      error: error.message
    });
  }
};

module.exports = initMobileMoneyPaymentHandler;
