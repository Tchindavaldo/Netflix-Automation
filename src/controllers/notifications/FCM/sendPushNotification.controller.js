const sendPushNotificationService = require('../../../services/notification/FCM/sendPushNotification.service');

exports.sendPushNotificationController = async (req, res) => {
  const { token, title, body, data } = req.body;

  console.log('📬 Requête POST /send-push reçue');
  
  if (!token) {
    console.warn('⚠️ Token FCM manquant dans la requête');
    return res.status(400).json({ success: false, error: 'Token manquant' });
  }

  const result = await sendPushNotificationService({ token, title, body, data });

  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(500).json({ error: result.error });
  }
};
