const { db } = require('../../config/firebase');
const zohoImapService = require('./zohoImapService');

/**
 * Service pour traiter les emails reçus et les enregistrer dans Firestore
 */
class ProcessUserEmails {
  constructor() {
    this.collectionName = 'netflix_user_notification';
  }

  /**
   * Récupère tous les emails depuis Zoho et filtre ceux qui correspondent à nos abonnés
   */
  async syncEmails() {
    try {
      const newEmails = await zohoImapService.fetchNewEmails();
      
      if (newEmails.length === 0) {
        console.log('✅ Aucun nouvel email Zoho.');
        return { success: true, processed: 0 };
      }

      // console.log(`🔄 Analyse de ${newEmails.length} emails...`);
      
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

      for (const email of newEmails) {
        const recipients = (email.to || '').toLowerCase();
        const messageId = email.messageId;

        // 1. Vérifier si ce message_id existe déjà pour éviter les doublons
        const existingMailQuery = await db.collection(this.collectionName)
          .where('message_id', '==', messageId)
          .limit(1)
          .get();

        if (!existingMailQuery.empty) {
          // console.log(`⏭️ Email déjà enregistré (ID: ${messageId}), on passe.`);
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
            subscriber_email: matchedEmail,
            subject: email.subject,
            from: email.from,
            to: email.to,
            date: email.date || new Date(),
            content_text: email.text,
            content_html: email.html,
            message_id: messageId,
            received_at: new Date().toISOString(),
            status: 'new'
          });
          processedCount++;
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
