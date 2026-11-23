const {
  getMessageCost,
  getVerificationDetails,
} = require('../../../services/notification/whatsapp/getMessageCost.service');

exports.getMessageCostController = async (req, res) => {
  try {
    const { id } = req.params;
    const { channel } = req.query;

    const response = await getMessageCost({ messageId: id, channel: channel || 'whatsapp' });
    return res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('❌ Erreur Controller coût message:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la récupération du coût.',
    });
  }
};

exports.getVerificationDetailsController = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await getVerificationDetails({ verificationId: id });
    return res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('❌ Erreur Controller détail vérification:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la récupération de la vérification.',
    });
  }
};
