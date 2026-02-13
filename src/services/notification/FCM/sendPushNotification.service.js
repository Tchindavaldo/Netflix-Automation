// services/sendPushNotification.js

const { admin } = require('../../../config/firebase');

const sendPushNotification = async ({ token, title, body, data = {} }) => {
  const message = {
    token,
    notification: {
      title,
      body,
    },
    android: {
      // priority: 'high',
      notification: {
        channelId: 'high_priority_channel',
        icon: 'ic_launcher',
        sound: 'default',
        // tag: 'group_id', // identifiant pour grouper les notifs
        // group: 'group_id', // identifiant de groupe
        // groupSummary: false,
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
    data,
  };

  try {
    console.log(`📤 Tentative d'envoi de notification push vers le token: ${token.substring(0, 15)}...`);
    console.log(`📝 Titre: "${title}" | Corps: "${body}"`);
    
    const response = await admin.messaging().send(message);
    
    console.log('✅ Notification push envoyée avec succès via Firebase:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification push Firebase:', error.message);
    if (error.code) console.error('Code d\'erreur Firebase:', error.code);
    return { success: false, error: error.message };
  }
};

module.exports = sendPushNotification;
