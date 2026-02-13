// services/sendPushNotification.js

const { admin } = require('../../../config/firebase');

const sendPushNotification = async ({ tokens, token, title, body, data = {} }) => {
  // On gère à la fois un token unique ou un tableau de tokens
  const targetTokens = tokens || (token ? [token] : []);
  
  if (!targetTokens || targetTokens.length === 0) {
    console.warn('⚠️ Aucun token fourni pour l\'envoi de la notification push.');
    return { success: false, message: 'No tokens provided' };
  }

  // Nettoyer les tokens (enlever les doublons ou valeurs vides)
  const finalTokens = [...new Set(targetTokens.filter(t => t && typeof t === 'string'))];

  const message = {
    notification: {
      title,
      body, 
    },
    android: {
      notification: {
        clickAction: 'OPEN_NOTIF_SPLASH',
        channelId: 'high_priority_channel',
        icon: 'ic_launcher',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
    data: data || {},
  };

  try {
    console.log(`📤 Tentative d'envoi de notification push vers ${finalTokens.length} token(s)`);
    console.log(`📝 Titre: "${title}" | Corps: "${body}"`);
    
    // Utilisation de sendEachForMulticast pour gérer plusieurs tokens efficacement
    const response = await admin.messaging().sendEachForMulticast({
      tokens: finalTokens,
      ...message
    });
    
    console.log(`✅ Résultat Push : ${response.successCount} succès, ${response.failureCount} échecs`);
    
    // Log des erreurs spécifiques par token si besoin
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`❌ Échec pour le token ${finalTokens[idx].substring(0, 10)}... :`, resp.error.message);
        }
      });
    }

    return { success: true, response };
  } catch (error) {
    console.error('❌ Erreur critique lors de l\'envoi Multicast:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = sendPushNotification;
