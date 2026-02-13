const { getNotificationsService } = require('../../../services/notification/request/getNotifications.services');

exports.getNotificationsController = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Paramètre userId manquant' });
    }

    const response = await getNotificationsService(userId);
    return res.status(response.success ? 200 : 400).json(response);

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur serveur lors de la récupération des notifications.' 
    });
  }
};
