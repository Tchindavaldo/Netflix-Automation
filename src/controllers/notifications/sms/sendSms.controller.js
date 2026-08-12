const {
  sendSmsTemplate,
  sendSmsText,
  getSmsStatus,
  listSmsTemplates,
} = require('../../../services/notification/sms/sendSms.service');

exports.sendSmsController = async (req, res) => {
  try {
    const { to, phoneNumber, template, parameters, language, text, category, from, metadata } = req.body;
    const target = to || phoneNumber;

    if (!target) {
      return res.status(400).json({ success: false, message: 'Paramètre to manquant' });
    }

    // Le template fournit corps, catégorie et expéditeur ; le texte libre exige un `from`.
    const response = template
      ? await sendSmsTemplate({ to: target, template, parameters, language, metadata })
      : await sendSmsText({ to: target, text, category, from, metadata });

    return res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('❌ Erreur Controller envoi SMS:', error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erreur serveur lors de l'envoi du SMS.",
    });
  }
};

exports.getSmsStatusController = async (req, res) => {
  try {
    const response = await getSmsStatus({ messageId: req.params.id });
    return res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('❌ Erreur Controller statut SMS:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la lecture du SMS.',
    });
  }
};

exports.listSmsTemplatesController = async (req, res) => {
  try {
    const response = await listSmsTemplates({ category: req.query.category });
    return res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('❌ Erreur Controller templates SMS:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la récupération des templates.',
    });
  }
};
