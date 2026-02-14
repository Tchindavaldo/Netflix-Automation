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
        channelId: 'moobilpay_channel_v2',
        icon: 'ic_notification',
        color: '#dc2626', // Rouge officiel MoobilPay
        notificationPriority: 'PRIORITY_MAX',
        visibility: 'PUBLIC'
        // On peut essayer d'ajouter un champ pour forcer l'icône mais c'est souvent géré par le client
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
    console.log(`📤 [FCM-SERVICE] Tentative d'envoi vers ${finalTokens.length} token(s)`);
    console.log(`📝 [FCM-SERVICE] Payload: { title: "${title}", body: "${body}" }`);
    
    if (finalTokens.length === 0) {
      console.warn('⚠️ [FCM-SERVICE] Liste de tokens finaux vide après filtrage.');
      return { success: false, message: 'No valid tokens' };
    }
    
    // Utilisation de sendEachForMulticast pour gérer plusieurs tokens efficacement
    const response = await admin.messaging().sendEachForMulticast({
      tokens: finalTokens,
      ...message
    });
    
    console.log(`✅ [FCM-SERVICE] Résultat : ${response.successCount} succès, ${response.failureCount} échecs`);
    
    const tokensToDelete = [];
    // Log des erreurs spécifiques par token si besoin
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error.code;
          const errorMsg = resp.error.message;
          console.error(`❌ [FCM-SERVICE] Échec token ${finalTokens[idx].substring(0, 30)}... :`, errorMsg);
          
          // Identifier les tokens invalides à supprimer (Unregistered ou Not Found)
          if (errorCode === 'messaging/registration-token-not-registered' || 
              errorMsg.includes('Requested entity was not found') ||
              errorMsg.includes('unregistered')) {
            tokensToDelete.push(finalTokens[idx]);
          }
        }
      });
    }

    return { success: true, response, tokensToDelete };
  } catch (error) {
    console.error('❌ [FCM-SERVICE] Erreur critique:', error.message);
    return { success: false, error: error.message, tokensToDelete: [] };
  }
};

module.exports = sendPushNotification;
