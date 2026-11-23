const {
  sendWhatsappMessage,
  sendWhatsappMessageBulk,
} = require('../../../services/notification/whatsapp/sendWhatsappMessage.service');

exports.sendWhatsappMessageController = async (req, res) => {
  try {
    const { to, recipients, text, message, template } = req.body;
    const content = text || message;

    if (!to && (!Array.isArray(recipients) || recipients.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre "to" ou "recipients" manquant',
      });
    }

    const response = Array.isArray(recipients) && recipients.length > 0
      ? await sendWhatsappMessageBulk({ recipients, text: content, template })
      : await sendWhatsappMessage({ to, text: content, template });

    return res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('❌ Erreur Controller WhatsApp:', error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erreur serveur lors de l'envoi du message WhatsApp.",
    });
  }
};
