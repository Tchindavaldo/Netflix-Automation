const { getNotificationService } = require('../../../services/notification/request/getNotification.services');

exports.getNotificationController = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Paramètre userId manquant' });
    }

    const response = await getNotificationService(userId);
    return res.status(response.success ? 200 : 400).json(response);
    
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur serveur lors de la récupération de la notification.' 
    });
  }
};
