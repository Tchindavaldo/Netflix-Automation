const {
  requestWhatsappAuth,
  verifyWhatsappAuth,
} = require('../../../services/notification/whatsapp/otp/whatsappAuth.service');
const { getCostSummary } = require('../../../services/notification/whatsapp/birdCost.service');

exports.requestAuthController = async (req, res) => {
  try {
    const { phoneNumber, phone } = req.body;
    const target = phoneNumber || phone;

    if (!target) {
      return res.status(400).json({ success: false, message: 'Paramètre phoneNumber manquant' });
    }

    const response = await requestWhatsappAuth({ phoneNumber: target });

    // 429 sur un renvoi trop rapproché : le frontend peut ainsi afficher un
    // compte à rebours au lieu d'un message d'erreur générique.
    if (response.code === 'cooldown') {
      res.set('Retry-After', String(response.data.retryAfter));
      return res.status(429).json(response);
    }

    return res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('❌ Erreur Controller demande auth WhatsApp:', error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erreur serveur lors de l'envoi du code.",
    });
  }
};

exports.verifyAuthController = async (req, res) => {
  try {
    const { phoneNumber, phone, code, otp, name, email } = req.body;
    const target = phoneNumber || phone;
    const submittedCode = code || otp;

    if (!target) {
      return res.status(400).json({ success: false, message: 'Paramètre phoneNumber manquant' });
    }
    if (!submittedCode) {
      return res.status(400).json({ success: false, message: 'Paramètre code manquant' });
    }

    const response = await verifyWhatsappAuth({
      phoneNumber: target,
      code: submittedCode,
      profile: { name, email },
    });

    // 401 sur un code refusé : c'est un échec d'authentification, pas une
    // requête malformée.
    return res.status(response.success ? 200 : 401).json(response);
  } catch (error) {
    console.error('❌ Erreur Controller vérification auth WhatsApp:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la vérification.',
    });
  }
};

exports.getCostSummaryController = async (req, res) => {
  try {
    const { from, to } = req.query;
    const summary = await getCostSummary({ from, to });
    return res.status(200).json({ success: true, message: 'Récapitulatif des coûts', data: summary });
  } catch (error) {
    console.error('❌ Erreur Controller récapitulatif coûts:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors du calcul des coûts.',
    });
  }
};
