const { db } = require('../../config/firebase');
const zohoImapService = require('./zohoImapService');
const { postNotificationService } = require('../notification/request/postNotification.service');

/**
 * Service pour traiter les emails reçus et les enregistrer dans Firestore
 */
class ProcessUserEmails {
  constructor() {
    this.collectionName = 'netflix_user_notification';
  }

  /**
   * Récupère les emails depuis Zoho et filtre ceux qui correspondent à nos abonnés
   * @param {boolean} onlyUnseen - Ne traiter que les messages non lus (pour le scan)
   * @param {object} specificEmail - Un message unique déjà récupéré (pour le temps réel)
   */
  async syncEmails(onlyUnseen = false, specificEmail = null) {
    try {
      let emailsToProcess = [];
      
      if (specificEmail) {
        // En mode temps réel, on reçoit directement l'email cible
        emailsToProcess = [specificEmail];
      } else {
        // Mode scan classique (startup/cron)
        console.log(`📡 [sync] Récupération d'une liste d'emails Zoho...`);
        emailsToProcess = await zohoImapService.fetchNewEmails(onlyUnseen);
      }

      if (emailsToProcess.length === 0) {
        // console.log('✅ Aucun email à traiter.');
        return { success: true, processed: 0 };
      }

      // console.log(`🔄 Analyse de ${emailsToProcess.length} emails...`);
      
      // Récupérer la liste des emails Netflix actifs dans notre système pour filtrage
      const credentialsSnapshot = await db.collection('netflix_credentials').get();
      const activeNetflixEmails = [];
      credentialsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.email) {
          activeNetflixEmails.push(data.email.toLowerCase());
        }
      });
      
      let processedCount = 0;
      const batch = db.batch();

      for (const email of emailsToProcess) {
        const recipients = (email.to || '').toLowerCase();
        const messageId = email.messageId;

        // 1. Vérifier si ce message_id existe déjà pour éviter les doublons
        const existingMailQuery = await db.collection(this.collectionName)
          .where('message_id', '==', messageId)
          .limit(1)
          .get();

        if (!existingMailQuery.empty) {
          if (specificEmail) console.log(`⏭️ L'email ${messageId} est déjà enregistré.`);
          continue;
        }

        // console.log(`📨 Zoho Recipient: [${recipients}]`);

        let matchedEmail = null;
        for (const target of activeNetflixEmails) {
          const isMatch = recipients.includes(target);
          if (isMatch) {
            // console.log(`  🔍 Comp: ${target} vs ${recipients} -> ✅ MATCH`);
            matchedEmail = target;
            break;
          } else {
            // console.log(`  🔍 Comp: ${target} vs ${recipients} -> ❌ No Match`);
          }
        }

        if (matchedEmail) {
          const mailRef = db.collection(this.collectionName).doc();
          batch.set(mailRef, {
            subscriber_email: matchedEmail || null,
            subject: email.subject || null,
            from: email.from || null,
            to: email.to || null,
            date: email.date || new Date(),
            content_text: email.text || null,
            content_html: email.html || null,
            message_id: messageId || null,
            received_at: new Date().toISOString(),
            status: 'new'
          });
          processedCount++;

          // --------- Envoi d'une notification push ---------
          try {
            console.log(`🔎 Recherche de l'activation pour l'email: ${matchedEmail}`);
            // 1. Chercher l'activation correspondante à l'email pour trouver le userId
            const activationQuery = await db.collection('plan_activation')
              .where('email', '==', matchedEmail)
              .orderBy('dateCreation', 'desc')
              .limit(1)
              .get();

            if (!activationQuery.empty) {
              const activation = activationQuery.docs[0].data();
              const targetUserId = activation.userId;
              console.log(`✅ Activation trouvée. Utilisateur cible (userId) : ${targetUserId}`);

              if (targetUserId) {
                // 2. Chercher le token de l'utilisateur
                let targetToken = '';
                const userDoc = await db.collection('users').doc(targetUserId).get();
                if (userDoc.exists) {
                  const userData = userDoc.data();
                  if (userData.fcmTokens && Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0) {
                    targetToken = userData.fcmTokens[0];
                  } else if (userData.fcmToken) {
                    targetToken = userData.fcmToken;
                  }
                  console.log(`✅ Token récupéré via ID direct: ${targetToken ? targetToken.substring(0,20)+'...' : 'Aucun token'}`);
                } else {
                  console.log(`🔄 Utilisateur non trouvé par ID direct, recherche par UID...`);
                  const userSnapshot = await db.collection('users').where('uid', '==', targetUserId).get();
                  if (!userSnapshot.empty) {
                     const userData = userSnapshot.docs[0].data();
                     if (userData.fcmTokens && Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0) {
                       targetToken = userData.fcmTokens[0];
                     } else if (userData.fcmToken) {
                       targetToken = userData.fcmToken;
                     }
                     console.log(`✅ Token récupéré via UID: ${targetToken ? targetToken.substring(0,20)+'...' : 'Aucun token'}`);
                  } else {
                     console.log(`⚠️ Utilisateur avec l'UID ${targetUserId} introuvable dans Firestore.`);
                  }
                }

                let senderStr = email.from;
                if (typeof senderStr === 'object' && senderStr !== null) {
                  // Selon la bibliothèque utilisée (mailparser, etc.), l'expéditeur peut être un objet.
                  // On essaie d'extraire le texte brut ou l'adresse email.
                  senderStr = senderStr.text || (senderStr.value && senderStr.value[0] && senderStr.value[0].address) || senderStr.address || "Expéditeur inconnu";
                }
                const notifTitle = email.subject ? email.subject : (senderStr || 'Nouvel email reçu');
                const contentText = email.text ? email.text : 'Vous avez reçu un nouveau message.';
                const notifBody = contentText.length > 150 ? contentText.substring(0, 150) + '...' : contentText;

                console.log(`🚀 Préparation de l'envoi de la notification: [Titre: ${notifTitle}]`);
                // 3. Envoyer la notification via le service
                await postNotificationService({
                  userId: targetUserId,
                  token: targetToken,
                  data: {
                    title: notifTitle,
                    body: notifBody,
                    type: "success"
                  }
                });
                console.log(`🎉 Succès: Notification push envoyée à l'utilisateur ${targetUserId}`);
              } else {
                console.log(`⚠️ Aucun userId défini dans l'activation pour l'email ${matchedEmail}`);
              }
            } else {
               console.log(`⚠️ Aucune activation correspondante trouvée pour l'email ${matchedEmail}`);
            }
          } catch (notifErr) {
            console.error('❌ Erreur lors de l\'envoi de la notification push:', notifErr.message);
          }
          // ------------------------------------------------
        }
      }

      if (processedCount > 0) {
        await batch.commit();
        console.log(`✅ Fin: ${processedCount} emails enregistrés.`);
      } else {
        // console.log('ℹ️ Fin: Aucun email correspondant aux abonnés actifs.');
      }

      return { success: true, processed: processedCount };
    } catch (error) {
      console.error('❌ Erreur syncEmails:', error);
      throw error;
    }
  }
}

module.exports = new ProcessUserEmails();
