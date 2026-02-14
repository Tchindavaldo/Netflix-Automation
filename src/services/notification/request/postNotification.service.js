const { db } = require('../../../config/firebase');
const { getIO } = require('../../../../socket');
const { validateNotificationData } = require('../../../utils/validator/validateNotificationData');
const sendPushNotification = require('../FCM/sendPushNotification.service');
const { getNotificationService } = require('./getNotification.services');
const userService = require('../../userService');

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
      // console.log(`📡 [SOCKET] Notification émise vers la room : ${currentUserId} (Notification ID: ${newNotif.id})`);
      
      // ✅ Récupération des tokens FCM de l'utilisateur pour le push
      try {
        console.log(`🔍 [FCM] Recherche de tokens pour l'utilisateur: ${currentUserId}`);
        const userDoc = await db.collection('users').doc(currentUserId).get();
        let tokensFound = 0;

        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
            targetTokens.push(...userData.fcmTokens);
            tokensFound = userData.fcmTokens.length;
          } else if (userData.fcmToken) {
            targetTokens.push(userData.fcmToken);
            tokensFound = 1;
          }
        } else {
          // Si non trouvé par ID, essayer par UID
          const userSnapshot = await db.collection('users').where('uid', '==', currentUserId).get();
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
              targetTokens.push(...userData.fcmTokens);
              tokensFound = userData.fcmTokens.length;
            } else if (userData.fcmToken) {
              targetTokens.push(userData.fcmToken);
              tokensFound = 1;
            }
          }
        }
        console.log(`✅ [FCM] ${tokensFound} token(s) trouvé(s) pour l'utilisateur ${currentUserId}`);
      } catch (e) {
        console.warn(`⚠️ [FCM] Erreur lors de la récupération des tokens pour ${currentUserId}:`, e.message);
      }

      results.push({ userId: currentUserId, notificationId: newNotif.id });
    }

    // ✅ Nettoyer les tokens (enlever les doublons)
    const finalTokens = [...new Set(targetTokens.filter(t => t && typeof t === 'string'))];
    console.log(`📱 [FCM] Total de tokens uniques à notifier : ${finalTokens.length}`);
    if (finalTokens.length > 0) {
      console.log(`🎫 [FCM] Liste complète des tokens cibles :`, finalTokens);
    }

    // ✅ Envoi groupé des Push Notifications (FCM Multicast)
    if (finalTokens.length > 0) {
      // console.log('🚀 [FCM] Lancement de l\'envoi push multicast...');
      const pushResult = await sendPushNotification({
        tokens: finalTokens,
        title: data.title,
        body: data.body,
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        }
      });

      // ✅ Nettoyage automatique des tokens invalides
      if (pushResult.tokensToDelete && pushResult.tokensToDelete.length > 0) {
        userService.removeInvalidFcmTokens(pushResult.tokensToDelete).catch(err => 
          console.error('❌ [FCM-CLEANUP] Erreur lors du nettoyage:', err.message)
        );
      }
      // console.log(`🏁 [FCM] Résultat de l'envoi push : ${pushResult.success ? 'Succès' : 'Échec'}`);
    } else {
      // console.log('ℹ️ [FCM] Aucun token valide trouvé, envoi push ignoré.');
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
