// GET /api/payment/status/:transactionId
// Interroge Digikuntz pour récupérer le statut courant d'une transaction.

const axios = require('axios');

const STATUS_MAP = {
  payin_pending: 'pending',
  payin_success: 'success',
  payin_error: 'failed',
  payin_closed: 'cancelled',
};

const checkPaymentStatusHandler = async (req, res) => {
  try {
    const { transactionId } = req.params;
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'transactionId requis' });
    }

    const verifyUrl = process.env.PAYMENT_API_URL;
    const paymentUserId = process.env.PAYMENT_USER_ID;
    const secretKey = process.env.PAYMENT_SECRET_KEY;

    const response = await axios.get(verifyUrl, {
      params: { transactionId },
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': paymentUserId,
        'x-secret-key': secretKey,
      },
      timeout: 15000,
    });

    const rawStatus = response.data?.status;
    return res.status(200).json({
      success: true,
      transactionId: response.data?.id,
      status: STATUS_MAP[rawStatus] || rawStatus,
      rawStatus,
      data: response.data?.data || null,
    });
  } catch (error) {
    console.error('❌ [CHECK-STATUS] Erreur:', error.message);
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: 'Erreur du provider',
        error: error.response.data,
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = checkPaymentStatusHandler;
