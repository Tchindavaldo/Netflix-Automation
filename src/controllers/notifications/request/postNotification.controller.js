const { postNotificationService } = require('../../../services/notification/request/postNotification.service');

exports.postNotificationController = async (req, res) => {
  try {
    // On extrait tout ce qui vient de la requête
    const { userId, userIds, token, tokens, title, body, type, data } = req.body;

    // On prépare l'objet pour le service
    // Priorité aux champs de l'objet 'data' s'ils existent, sinon ceux à la racine
    const notificationContent = {
      title: data?.title || title,
      body: data?.body || body,
      type: data?.type || type || 'info'
    };

    const serviceData = {
      data: notificationContent, // Les infos du message (title, body, type)
      userId: userId || undefined,
      userIds: userIds || undefined,
      token: token || undefined,
      tokens: tokens || undefined
    };

    if (!userId && !userIds) {
      return res.status(400).json({ success: false, message: 'Paramètre userId ou userIds manquant' });
    }

    if (!notificationContent.title || !notificationContent.body) {
      return res.status(400).json({ success: false, message: 'Titre ou corps de la notification manquant' });
    }

    const response = await postNotificationService(serviceData);
    return res.status(response.success ? 200 : 400).json(response);

  } catch (error) {
    console.error('❌ Erreur Controller Notification:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur serveur lors de la création de la notification.' 
    });
  }
};
