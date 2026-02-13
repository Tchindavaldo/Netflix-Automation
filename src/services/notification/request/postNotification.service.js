const { db } = require('../../../config/firebase');
const { getIO } = require('../../../../socket');
const { validateNotificationData } = require('../../../utils/validator/validateNotificationData');
const sendPushNotification = require('../FCM/sendPushNotification.service');
const { getNotificationService } = require('./getNotification.services');

exports.postNotificationService = async dataGet => {
  try {
    const { data, userId, userIds, token, tokens } = dataGet;

    // ✅ Nettoyage des cibles (on peut recevoir userId seul ou un tableau userIds)
    const targetUserIds = userIds || (userId ? [userId] : []);
    const targetTokens = tokens || (token ? [token] : []);

    if (targetUserIds.length === 0) {
      return { success: false, message: 'Aucun utilisateur cible (userId ou userIds manquant)' };
    }

    // ✅ Valider les données du message (title, body, etc.)
    const errors = validateNotificationData(data);
    if (errors.length > 0) return { success: false, message: errors };

    const io = getIO();
    const results = [];

    // On boucle sur chaque utilisateur pour créer/mettre à jour son historique de notifications
    for (const currentUserId of targetUserIds) {
      // 1. Chercher si l'utilisateur a déjà un document de notifications
      const response = await getNotificationService(currentUserId);
      const newNotif = {
        id: db.collection('notification').doc().id,
        title: data.title,
        body: data.body,
        type: data.type || 'info',
        isRead: [],
        createdAt: new Date().toISOString()
      };

      let docId;
      if (!response.data || response.data.length === 0) {
        // Création d'un nouveau groupe pour cet utilisateur
        const notificationData = {
          userId: currentUserId,
          updatedAt: new Date().toISOString(),
          allNotif: [newNotif]
        };
        const docRef = await db.collection('notification').add(notificationData);
        docId = docRef.id;
      } else {
        // Mise à jour de l'existant
        const notifDoc = response.data[0];
        docId = notifDoc.id;
        const updatedAllNotifArray = [newNotif, ...notifDoc.allNotif];
        await db.collection('notification').doc(docId).update({
          allNotif: updatedAllNotifArray,
          updatedAt: new Date().toISOString()
        });
      }

      // ✅ Émission Socket.IO pour cet utilisateur précis
      io.to(currentUserId).emit('newNotification', {
        idGroup: docId,
        ...newNotif,
        isRead: JSON.stringify(newNotif.isRead)
      });
      console.log(`📡 [SOCKET] Notification émise vers la room : ${currentUserId}`);
      
      results.push({ userId: currentUserId, notificationId: newNotif.id });
    }

    // ✅ Envoi groupé des Push Notifications (FCM Multicast)
    if (targetTokens.length > 0) {
      await sendPushNotification({
        tokens: targetTokens,
        title: data.title,
        body: data.body,
        data: {
          type: data.type || 'info',
          click_action: 'FLUTTER_NOTIFICATION_CLICK' // Utile pour certains plugins mobiles
        }
      });
    }

    return {
      success: true,
      message: `Notification traitée pour ${targetUserIds.length} utilisateur(s)`,
      data: results
    };

  } catch (error) {
    console.error('❌ Erreur critique postNotificationService:', error);
    return { success: false, message: error.message };
  }
};
