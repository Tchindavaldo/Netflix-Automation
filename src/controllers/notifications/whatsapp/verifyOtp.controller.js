const { verifyWhatsappOtp } = require('../../../services/notification/whatsapp/otp/verifyOtp.service');

exports.verifyOtpController = async (req, res) => {
  try {
    const { phoneNumber, phone, email, code, otp } = req.body;
    const target = phoneNumber || phone;
    const submittedCode = code || otp;

    if (!target && !email) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre phoneNumber ou email manquant',
      });
    }

    if (!submittedCode) {
      return res.status(400).json({ success: false, message: 'Paramètre code manquant' });
    }

    const response = await verifyWhatsappOtp({
      phoneNumber: target,
      email,
      code: submittedCode,
    });

    return res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    console.error('❌ Erreur Controller vérification OTP:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la vérification du code OTP.',
    });
  }
};
