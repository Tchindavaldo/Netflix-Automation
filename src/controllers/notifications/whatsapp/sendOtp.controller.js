const { sendWhatsappOtp } = require('../../../services/notification/whatsapp/otp/sendOtp.service');

exports.sendOtpController = async (req, res) => {
  try {
    const { phoneNumber, phone, email, userId } = req.body;
    const target = phoneNumber || phone;

    if (!target && !email) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre phoneNumber ou email manquant',
      });
    }

    const response = await sendWhatsappOtp({ phoneNumber: target, email, userId });
    return res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('❌ Erreur Controller OTP WhatsApp:', error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erreur serveur lors de l'envoi du code OTP.",
    });
  }
};
