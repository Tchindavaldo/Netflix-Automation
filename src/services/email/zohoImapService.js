const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

/**
 * Service pour interagir avec Zoho via IMAP
 */
class ZohoImapService {
  constructor() {
    this.config = {
      host: process.env.ZOHO_IMAP_HOST || 'imap.zoho.com',
      port: parseInt(process.env.ZOHO_IMAP_PORT) || 993,
      secure: true,
      auth: {
        user: process.env.ZOHO_IMAP_USER,
        pass: process.env.ZOHO_IMAP_PASSWORD,
      },
      syncDays: parseInt(process.env.EMAIL_SYNC_DAYS) || 7
    };
  }

  /**
   * Récupère les messages des 7 derniers jours
   * @returns {Promise<Array>} Liste des messages parsés
   */
  async fetchNewEmails() {
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass
      },
      logger: false,
      connectionTimeout: 30000,
      greetingTimeout: 30000
    });

    const emails = [];

    // Empêcher les erreurs de socket de faire planter le processus global
    client.on('error', err => {
      console.error('⚠️ Erreur Socket IMAP:', err.message);
    });

    try {
      await client.connect();

      // Sélectionner la boîte de réception
      let lock = await client.getMailboxLock('INBOX');
      try {
        // Calculer la date d'il y a X jours
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - this.config.syncDays);

        // Rechercher les messages
        const uids = await client.search({ since: sinceDate });
        
        if (uids.length > 0) {
          // console.log(`📥 [Zoho] ${uids.length} emails détectés sur les ${this.config.syncDays} dernier(s) jour(s).`);
          // Récupérer les messages trouvés
          for await (let message of client.fetch(uids, { 
            source: true,
            uid: true,
            envelope: true,
            bodyStructure: true
          })) {
            const parsed = await simpleParser(message.source);
            
            emails.push({
              subject: parsed.subject || message.envelope?.subject,
              from: parsed.from?.text || message.envelope?.from?.map(f => f.address).join(', '),
              to: parsed.to?.text || message.envelope?.to?.map(t => t.address).join(', '),
              date: parsed.date || message.envelope?.date,
              text: parsed.text,
              html: parsed.html,
              messageId: parsed.messageId || message.envelope?.messageId,
              uid: message.uid
            });
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err) {
      console.error('❌ Erreur Zoho IMAP:', err);
      throw err;
    }

    return emails;
  }

  /**
   * Écoute en temps réel les nouveaux emails via IMAP IDLE
   * @param {Function} onNewEmail Callback appelé quand un nouveau mail est détecté
   */
  async watchEmails(onNewEmail) {
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass
      },
      logger: false
    });

    this.watcherClient = client;

    client.on('error', err => {
      console.error('⚠️ Watcher Socket Error:', err.message);
    });

    try {
      await client.connect();
      // console.log('📡 [Zoho IDLE] Connexion établie pour l\'écoute en temps réel...');

      // Sélectionner la boîte et passer en mode IDLE
      let lock = await client.getMailboxLock('INBOX');
      try {
        // Écouter l'événement 'exists' qui signale l'arrivée d'un nouveau mail
        client.on('exists', async (data) => {
          // console.log('🔔 [Zoho] Changement détecté dans IMAP (nouveau mail possible)');
          if (onNewEmail) await onNewEmail();
        });

        // La connexion reste ouverte grâce au lock ou simplement en ne faisant pas logout
      } finally {
        lock.release();
      }

    } catch (err) {
      console.error('❌ Erreur initialisation Watcher IDLE:', err);
      // Reconnexion après 1 min
      setTimeout(() => this.watchEmails(onNewEmail), 60000);
    }
  }

  async stopWatcher() {
    if (this.watcherClient) {
      await this.watcherClient.logout();
    }
  }
}

module.exports = new ZohoImapService();
