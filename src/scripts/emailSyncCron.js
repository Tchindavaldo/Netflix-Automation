const cron = require('node-cron');
const processUserEmails = require('../services/email/processUserEmails');
const zohoImapService = require('../services/email/zohoImapService');

/**
 * Initialise les tâches planifiées pour la synchronisation des emails
 */
const initEmailSyncCron = () => {
  // console.log('⏰ Initialisation du cron pour la synchronisation des emails...');

  // Exécuter toutes les 5 minutes
  // Format: minute hour day-of-month month day-of-week
  cron.schedule('*/5 * * * *', async () => {
    try {
      // console.log('⏰ [CRON] Lancement de la synchronisation des emails Zoho...');
      await processUserEmails.syncEmails();
    } catch (error) {
      console.error('⏰ [CRON] Erreur lors de la synchronisation des emails:', error.message);
    }
  });

  // Optionnel: Exécuter une fois au démarrage et lancer le watcher temps réel
  setTimeout(async () => {
    try {
      // console.log('🚀 [STARTUP] Première synchronisation des emails...');
      await processUserEmails.syncEmails();

      // Lancer l'écoute en temps réel après la première synchro
      // console.log('🚀 [STARTUP] Initialisation du mode temps réel (IDLE)...');
      await zohoImapService.watchEmails(async () => {
        try {
          // On peut attendre quelques secondes pour être sûr que le mail est totalement arrivé/indexé
          setTimeout(async () => {
            await processUserEmails.syncEmails();
          }, 2000);
        } catch (err) {
          console.error('❌ Erreur lors de la synchro déclenchée par IDLE:', err.message);
        }
      });

    } catch (error) {
      console.error('🚀 [STARTUP] Erreur lors de l\'initialisation email:', error.message);
    }
  }, 10000); // 10 secondes après le démarrage
};

module.exports = initEmailSyncCron;
