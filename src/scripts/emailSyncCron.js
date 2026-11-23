const cron = require('node-cron');
const processUserEmails = require('../services/email/processUserEmails');
const zohoImapService = require('../services/email/zohoImapService');

/**
 * Initialise les tâches planifiées pour la synchronisation des emails
 */
const initEmailSyncCron = () => {
  // console.log('⏰ Initialisation du cron pour la synchronisation des emails...');

  // Exécuter toutes les 2 minutes (Désactivé à la demande de l'utilisateur)
  // cron.schedule('*/2 * * * *', async () => {
  //   try {
  //     // console.log('⏰ [CRON] Lancement de la synchronisation des emails Zoho...');
  //     await processUserEmails.syncEmails();
  //   } catch (error) {
  //     console.error('⏰ [CRON] Erreur lors de la synchronisation des emails:', error.message);
  //   }
  // });

  // Optionnel: Exécuter une fois au démarrage et lancer le watcher temps réel
  setTimeout(async () => {
    try {
      console.log('🚀 [STARTUP] Première synchronisation des emails...');
      await processUserEmails.syncEmails();

      // Lancer l'écoute en temps réel après la première synchro
      // IMPORTANT: pas de 'await' ici — watchEmails est bloquant (idle() infini), on le lance en arrière-plan
      console.log('📡 [STARTUP] Initialisation du mode temps réel (IDLE) pour la réception instantanée...');
      zohoImapService.watchEmails(async (emailData) => {
        try {
          console.log(`⚡ [IDLE] Nouveau mail reçu: "${emailData.subject}". Traitement immédiat...`);
          // On passe false (pas de scan unseen) et l'email unique reçu
          await processUserEmails.syncEmails(false, emailData);
        } catch (err) {
          console.error('❌ Erreur dans le traitement temps réel IDLE:', err.message);
        }
      }).catch(err => {
        console.error('❌ [IDLE] Erreur fatale du watcher:', err.message);
      });

    } catch (error) {
      console.error('🚀 [STARTUP] Erreur lors de l\'initialisation email:', error.message);
    }
  }, 2000); // 2 secondes après le démarrage
};

module.exports = initEmailSyncCron;
