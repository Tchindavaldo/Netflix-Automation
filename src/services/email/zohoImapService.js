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
   * Récupère les messages récents
   * @param {boolean} onlyUnseen - Si vrai, ne récupère que les messages non lus
   * @returns {Promise<Array>} Liste des messages parsés
   */
  async fetchNewEmails(onlyUnseen = false) {
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass
      },
      logger: false,
      connectionTimeout: 60000,
      greetingTimeout: 60000
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
        // Calculer la date d'il y a X jours pour la recherche de base
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - this.config.syncDays);

        // Critères de recherche : Depuis X jours + (Optionnel) Uniquement Non Lus
        const searchCriteria = { since: sinceDate };
        if (onlyUnseen) {
          searchCriteria.unseen = true;
        }

        // Rechercher les messages
        const uids = await client.search(searchCriteria);
        
        if (uids.length > 0) {
          console.log(`📥 [Zoho] ${uids.length} emails ${onlyUnseen ? 'NON LUS' : 'au total'} détectés.`);
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
    const startWatcher = async () => {
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
        console.error('⚠️ [IDLE] Watcher Socket Error:', err.message);
      });

      try {
        await client.connect();
        console.log('📡 [Zoho IDLE] Connexion établie pour l\'écoute en temps réel...');

        // Ouvrir la boîte SANS lock (compatible avec idle())
        const mailbox = await client.mailboxOpen('INBOX');
        console.log(`📬 [Zoho IDLE] INBOX ouvert (${mailbox.exists} messages), en attente d'événements...`);
        
        let lastCount = mailbox.exists;

        // Écouter l'événement 'exists'
        client.on('exists', async (data) => {
          const newCount = data.count;
          const diff = newCount - lastCount;
          
          if (diff > 0) {
            console.log(`🔔 [Zoho IDLE] ${diff} nouveau(x) message(s) détecté(s). Récupération des index ${lastCount + 1} à ${newCount}...`);
            
            if (onNewEmail) {
              try {
                // On récupère la plage de messages (ex: "401:500")
                const range = `${lastCount + 1}:${newCount}`;
                for await (let message of client.fetch(range, { 
                  source: true, uid: true, envelope: true
                })) {
                  const parsed = await simpleParser(message.source);
                  const emailData = {
                    subject: parsed.subject || message.envelope?.subject,
                    from: parsed.from?.text || message.envelope?.from?.map(f => f.address).join(', '),
                    to: parsed.to?.text || message.envelope?.to?.map(t => t.address).join(', '),
                    date: parsed.date || message.envelope?.date,
                    text: parsed.text,
                    html: parsed.html,
                    messageId: parsed.messageId || message.envelope?.messageId,
                    uid: message.uid
                  };
                  
                  // On traite chaque nouvel email individuellement
                  await onNewEmail(emailData);
                }
              } catch (err) {
                console.error('❌ [IDLE] Erreur lors du fetch de la plage de messages:', err.message);
              }
            }
          }
          // On met à jour le dernier compte connu
          lastCount = newCount;
        });

        console.log('🔄 [Zoho IDLE] Entrée en mode IDLE (attente active de nouveaux emails)...');
        // idle() bloque tant que la connexion est active — le serveur pousse les events exists
        await client.idle();

      } catch (err) {
        console.error('❌ [Zoho IDLE] Erreur watcher IDLE:', err.message);
      } finally {
        try { await client.logout(); } catch (_) {}
        // Reconnexion automatique après 30 secondes si la connexion est perdue
        console.log('🔄 [Zoho IDLE] Connexion perdue. Reconnexion dans 30 secondes...');
        setTimeout(() => startWatcher(), 30000);
      }
    };

    await startWatcher();
  }

  async stopWatcher() {
    if (this.watcherClient) {
      await this.watcherClient.logout();
    }
  }
}

module.exports = new ZohoImapService();
