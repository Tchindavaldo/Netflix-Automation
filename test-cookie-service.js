// Script de test pour le service de cookies Netflix automatisé
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCookieService() {
  console.log('🧪 === Test du Service de Cookies Netflix Automatisé ===\n');

  try {
    // 1. Démarrer la session Netflix
    console.log('1️⃣ Démarrage de la session Netflix...');
    const startResponse = await fetch(`${BASE_URL}/api/netflix/session/start`, {
      method: 'POST'
    });
    const startResult = await startResponse.json();
    console.log('Résultat:', startResult.success ? '✅ Succès' : '❌ Échec');
    if (startResult.message) console.log('Message:', startResult.message);
    
    if (!startResult.success) {
      console.log('❌ Impossible de démarrer la session. Arrêt du test.');
      return;
    }

    // Attendre que la session s'initialise
    console.log('\n⏳ Attente de l\'initialisation (10 secondes)...');
    await sleep(10000);

    // 2. Vérifier le statut de la session
    console.log('\n2️⃣ Vérification du statut de la session...');
    const statusResponse = await fetch(`${BASE_URL}/api/netflix/session/status`);
    const statusResult = await statusResponse.json();
    console.log('Session active:', statusResult.status?.active ? '✅ Oui' : '❌ Non');
    console.log('Cookies trouvés:', statusResult.status?.cookiesCount || 0);
    console.log('Surveillance active:', statusResult.status?.monitoringActive ? '✅ Oui' : '❌ Non');

    // 3. Récupérer les cookies
    console.log('\n3️⃣ Récupération des cookies...');
    const cookiesResponse = await fetch(`${BASE_URL}/api/netflix/cookies`);
    const cookiesResult = await cookiesResponse.json();
    console.log('Cookies disponibles:', cookiesResult.success ? '✅ Oui' : '❌ Non');
    
    if (cookiesResult.success && cookiesResult.cookies.individual) {
      console.log('Cookies Netflix trouvés:');
      Object.keys(cookiesResult.cookies.individual).forEach(name => {
        console.log(`  - ${name}: ${cookiesResult.cookies.individual[name].substring(0, 50)}...`);
      });
    }

    // 4. Tester l'endpoint automatique
    console.log('\n4️⃣ Test de l\'endpoint Netflix automatique...');
    const autoResponse = await fetch(`${BASE_URL}/api/netflix/path-evaluator-auto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        param: '{"flow":"signupSimplicity","mode":"planSelection","action":"planSelectionAction","fields":{"planChoice":{"value":"4120"},"previousMode":"planSelectionWithContext"}}'
      })
    });
    
    const autoResult = await autoResponse.json();
    console.log('Appel Netflix automatique:', autoResult.success ? '✅ Succès' : '❌ Échec');
    console.log('Status Netflix:', autoResult.status);
    
    if (autoResult.success) {
      console.log('✅ Netflix a répondu avec succès !');
      console.log('Cookies utilisés:', Object.keys(autoResult.usedCookies || {}).join(', '));
    } else {
      console.log('❌ Erreur:', autoResult.message);
    }

    // 5. Attendre un peu pour voir la surveillance en action
    console.log('\n5️⃣ Test de la surveillance automatique...');
    console.log('⏳ Attente de 35 secondes pour voir la mise à jour automatique des cookies...');
    await sleep(35000);

    // Vérifier si les cookies ont été mis à jour
    const updatedCookiesResponse = await fetch(`${BASE_URL}/api/netflix/cookies`);
    const updatedCookiesResult = await updatedCookiesResponse.json();
    console.log('Cookies mis à jour automatiquement:', 
      updatedCookiesResult.cookies.lastUpdated !== cookiesResult.cookies.lastUpdated ? '✅ Oui' : '❌ Non');

    // 6. Tester la navigation
    console.log('\n6️⃣ Test de navigation vers une autre page...');
    const navResponse = await fetch(`${BASE_URL}/api/netflix/navigate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: '/signup/planform'
      })
    });
    
    const navResult = await navResponse.json();
    console.log('Navigation:', navResult.success ? '✅ Succès' : '❌ Échec');
    if (navResult.currentUrl) {
      console.log('URL actuelle:', navResult.currentUrl);
    }

    console.log('\n🎉 Test terminé ! La session reste active en arrière-plan.');
    console.log('💡 Vous pouvez maintenant utiliser l\'endpoint /api/netflix/path-evaluator-auto');
    console.log('🛑 Pour arrêter la session: POST /api/netflix/session/stop');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Fonction pour arrêter proprement la session
async function stopSession() {
  console.log('\n🛑 Arrêt de la session Netflix...');
  try {
    const response = await fetch(`${BASE_URL}/api/netflix/session/stop`, {
      method: 'POST'
    });
    const result = await response.json();
    console.log('Session arrêtée:', result.success ? '✅ Succès' : '❌ Échec');
  } catch (error) {
    console.error('Erreur lors de l\'arrêt:', error.message);
  }
}

// Fonction pour obtenir juste les cookies
async function getCookies() {
  try {
    const response = await fetch(`${BASE_URL}/api/netflix/cookies`);
    const result = await response.json();
    
    if (result.success && result.cookies.cookieString) {
      console.log('🍪 Cookies Netflix (format pour Postman):');
      console.log(result.cookies.cookieString);
      console.log('\n📋 Cookies individuels:');
      Object.entries(result.cookies.individual || {}).forEach(([name, value]) => {
        console.log(`${name}: ${value}`);
      });
    } else {
      console.log('❌ Aucune session active ou cookies non disponibles');
    }
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

// Gestion des arguments de ligne de commande
const args = process.argv.slice(2);

if (args.includes('--stop')) {
  stopSession();
} else if (args.includes('--cookies')) {
  getCookies();
} else if (args.includes('--help')) {
  console.log(`
🧪 Test du Service de Cookies Netflix

Usage:
  node test-cookie-service.js          # Test complet
  node test-cookie-service.js --stop   # Arrêter la session
  node test-cookie-service.js --cookies # Afficher les cookies actuels
  node test-cookie-service.js --help   # Afficher cette aide
  `);
} else {
  testCookieService();
}

module.exports = { testCookieService, stopSession, getCookies };
