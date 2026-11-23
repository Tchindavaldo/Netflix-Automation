// services/sendPushNotification.js

const { admin } = require('../../../config/firebase');
const sendApnsPush = require('../APNS/sendApnsPush.service');

const sendPushNotification = async ({ tokens, token, apnsTokens, title, body, data = {} }) => {
  // Branche iOS APNs si des tokens iOS sont fournis (envoi parallèle)
  let apnsResult = null;
  if (apnsTokens && apnsTokens.length > 0) {
    apnsResult = await sendApnsPush({ tokens: apnsTokens, title, body, data });
  }

  // On gère à la fois un token unique ou un tableau de tokens (FCM Android)
  const targetTokens = tokens || (token ? [token] : []);
  
  if (!targetTokens || targetTokens.length === 0) {
    if (apnsResult) {
      return { success: apnsResult.success, apns: apnsResult, tokensToDelete: apnsResult.tokensToDelete || [] };
    }
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
      priority: 'high',
      notification: {
        clickAction: 'expo.modules.notifications.ROUTE_NOTIFICATION',
        channelId: 'moobilpay_channel_v2',
        icon: 'notification_icon',
        color: '#dc2626', // Rouge officiel MoobilPay
        notificationPriority: 'PRIORITY_MAX',
        visibility: 'PUBLIC'
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

    const combinedTokensToDelete = [
      ...tokensToDelete,
      ...(apnsResult?.tokensToDelete || []),
    ];
    return { success: true, response, apns: apnsResult, tokensToDelete: combinedTokensToDelete };
  } catch (error) {
    console.error('❌ [FCM-SERVICE] Erreur critique:', error.message);
    return {
      success: false,
      error: error.message,
      apns: apnsResult,
      tokensToDelete: apnsResult?.tokensToDelete || [],
    };
  }
};

module.exports = sendPushNotification;
