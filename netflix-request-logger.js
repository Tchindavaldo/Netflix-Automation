const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class NetflixRequestLogger {
  constructor() {
    this.browser = null;
    this.page = null;
    this.logFile = path.join(__dirname, 'netflix-requests.log');
    this.requestLogs = [];
  }

  async init() {
    console.log('🚀 Initialisation du logger Netflix...');
    
    // Lancer le navigateur en mode interactif (headful)
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 100, // Ralentit les actions pour une meilleure observation
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    this.page = await context.newPage();
    
    // Intercepter toutes les requêtes réseau
    await this.setupRequestInterception();
    
    console.log('✅ Navigateur lancé en mode interactif');
    console.log('📝 Les requêtes seront loggées dans:', this.logFile);
    console.log('🌐 Vous pouvez maintenant naviguer manuellement vers Netflix');
    
    return this.page;
  }

  async setupRequestInterception() {
    // Intercepter toutes les requêtes
    this.page.on('request', async (request) => {
      const method = request.method();
      const url = request.url();
      const headers = request.headers();
      
      // Logger toutes les requêtes POST
      if (method === 'POST') {
        const timestamp = new Date().toISOString();
        const postData = request.postData();
        
        const logEntry = {
          timestamp,
          method,
          url,
          headers,
          body: postData,
          type: 'REQUEST'
        };

        this.requestLogs.push(logEntry);
        
        // Afficher dans la console
        console.log('\n🔴 REQUÊTE POST INTERCEPTÉE:');
        console.log('⏰ Timestamp:', timestamp);
        console.log('🌐 URL:', url);
        console.log('📋 Headers:', JSON.stringify(headers, null, 2));
        console.log('📦 Body:', postData || 'Pas de body');
        console.log('─'.repeat(80));
        
        // Sauvegarder dans le fichier
        await this.saveToFile(logEntry);
      }
    });

    // Intercepter les réponses
    this.page.on('response', async (response) => {
      const request = response.request();
      const method = request.method();
      
      if (method === 'POST') {
        const timestamp = new Date().toISOString();
        const url = response.url();
        const status = response.status();
        const headers = response.headers();
        
        let responseBody = '';
        try {
          responseBody = await response.text();
        } catch (e) {
          responseBody = 'Impossible de lire le body de la réponse';
        }

        const logEntry = {
          timestamp,
          method,
          url,
          status,
          headers,
          body: responseBody,
          type: 'RESPONSE'
        };

        this.requestLogs.push(logEntry);
        
        console.log('\n🟢 RÉPONSE POST REÇUE:');
        console.log('⏰ Timestamp:', timestamp);
        console.log('🌐 URL:', url);
        console.log('📊 Status:', status);
        console.log('📋 Headers:', JSON.stringify(headers, null, 2));
        console.log('📦 Body:', responseBody.substring(0, 500) + (responseBody.length > 500 ? '...' : ''));
        console.log('─'.repeat(80));
        
        await this.saveToFile(logEntry);
      }
    });
  }

  async saveToFile(logEntry) {
    const logLine = `\n${'='.repeat(100)}\n${JSON.stringify(logEntry, null, 2)}\n${'='.repeat(100)}\n`;
    
    try {
      await fs.promises.appendFile(this.logFile, logLine);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
    }
  }

  async navigateToNetflix() {
    console.log('🎬 Navigation vers Netflix...');
    await this.page.goto('https://www.netflix.com', { waitUntil: 'networkidle' });
    console.log('✅ Page Netflix chargée');
    console.log('👆 Vous pouvez maintenant naviguer manuellement vers /signup/creditoption');
  }

  async waitForButtonClick() {
    console.log('⏳ En attente du clic sur le bouton "Start Membership"...');
    
    // Surveiller les clics sur le bouton spécifique
    await this.page.evaluate(() => {
      // Observer les mutations DOM pour détecter les nouveaux boutons
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const buttons = node.querySelectorAll ? 
                node.querySelectorAll('button[data-uia="action-submit-payment"]') : [];
              
              buttons.forEach(button => {
                if (!button.hasAttribute('data-logger-attached')) {
                  button.setAttribute('data-logger-attached', 'true');
                  button.addEventListener('click', () => {
                    console.log('🎯 Bouton "Start Membership" cliqué!');
                  });
                }
              });
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Attacher l'événement aux boutons déjà présents
      const existingButtons = document.querySelectorAll('button[data-uia="action-submit-payment"]');
      existingButtons.forEach(button => {
        if (!button.hasAttribute('data-logger-attached')) {
          button.setAttribute('data-logger-attached', 'true');
          button.addEventListener('click', () => {
            console.log('🎯 Bouton "Start Membership" cliqué!');
          });
        }
      });
    });
  }

  async generateReport() {
    const reportFile = path.join(__dirname, 'netflix-requests-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      totalRequests: this.requestLogs.length,
      postRequests: this.requestLogs.filter(log => log.method === 'POST').length,
      requests: this.requestLogs
    };

    await fs.promises.writeFile(reportFile, JSON.stringify(report, null, 2));
    console.log('📊 Rapport généré:', reportFile);
    return reportFile;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Navigateur fermé');
    }
  }
}

// Fonction principale
async function startNetflixLogger() {
  const logger = new NetflixRequestLogger();
  
  try {
    // Initialiser le logger
    await logger.init();
    
    // Naviguer vers Netflix
    await logger.navigateToNetflix();
    
    // Surveiller les clics sur le bouton
    await logger.waitForButtonClick();
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 SERVICE NETFLIX REQUEST LOGGER ACTIF');
    console.log('='.repeat(80));
    console.log('📋 Instructions:');
    console.log('1. Naviguer manuellement vers https://www.netflix.com/signup/creditoption');
    console.log('2. Remplir le formulaire comme d\'habitude');
    console.log('3. Cliquer sur le bouton "Start Membership"');
    console.log('4. Toutes les requêtes POST seront automatiquement loggées');
    console.log('5. Appuyer sur Ctrl+C pour arrêter le service');
    console.log('='.repeat(80));
    
    // Garder le processus actif
    process.on('SIGINT', async () => {
      console.log('\n🛑 Arrêt du service...');
      await logger.generateReport();
      await logger.close();
      process.exit(0);
    });
    
    // Attendre indéfiniment
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    await logger.close();
  }
}

// Lancer le service si ce fichier est exécuté directement
if (require.main === module) {
  startNetflixLogger();
}

module.exports = NetflixRequestLogger;
