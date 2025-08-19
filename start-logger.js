#!/usr/bin/env node

const NetflixRequestLogger = require('./netflix-request-logger');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    NETFLIX REQUEST LOGGER                    ║
║                                                              ║
║  🎯 Intercepte toutes les requêtes POST lors du clic sur    ║
║     le bouton "Start Membership"                            ║
║                                                              ║
║  📝 Logs sauvegardés dans: netflix-requests.log            ║
║  📊 Rapport final: netflix-requests-report.json            ║
╚══════════════════════════════════════════════════════════════╝
`);

async function main() {
  const logger = new NetflixRequestLogger();
  
  try {
    console.log('🚀 Démarrage du service...\n');
    
    // Initialiser le logger
    await logger.init();
    
    // Naviguer vers Netflix
    await logger.navigateToNetflix();
    
    // Surveiller les clics
    await logger.waitForButtonClick();
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 SERVICE ACTIF - PRÊT À LOGGER LES REQUÊTES');
    console.log('='.repeat(80));
    console.log('📋 ÉTAPES À SUIVRE:');
    console.log('   1️⃣  Naviguer vers: https://www.netflix.com/signup/creditoption');
    console.log('   2️⃣  Remplir le formulaire d\'inscription');
    console.log('   3️⃣  Cliquer sur "Start Membership"');
    console.log('   4️⃣  Observer les logs dans la console');
    console.log('   5️⃣  Ctrl+C pour arrêter et générer le rapport');
    console.log('='.repeat(80));
    console.log('⚠️  IMPORTANT: Laissez cette fenêtre ouverte pendant la navigation');
    console.log('='.repeat(80));
    
    // Garder le processus actif
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Arrêt du service en cours...');
      console.log('📊 Génération du rapport final...');
      
      const reportFile = await logger.generateReport();
      console.log('✅ Rapport sauvegardé:', reportFile);
      
      await logger.close();
      console.log('👋 Service arrêté. Merci d\'avoir utilisé Netflix Request Logger!');
      process.exit(0);
    });
    
    // Attendre indéfiniment
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error('💡 Vérifiez que Playwright est installé: npm install playwright');
    await logger.close();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
