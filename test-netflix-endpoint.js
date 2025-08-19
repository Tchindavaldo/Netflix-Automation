// Test script pour l'endpoint Netflix API
const fetch = require('node-fetch');

async function testNetflixEndpoint() {
  const serverUrl = 'http://localhost:3000/api/netflix/path-evaluator';
  
  // Exemple de données à envoyer
  const testData = {
    // Cookies Netflix (remplacez par vos vrais cookies)
    cookies: 'flwssn=efb88d45-f980-4ad0-9226-773132b59c05; nfvdid=BQFmAAEBEFvk2YmJe9Am-0120-zD09xARqYaVrSHB8Qhl3l83o5s1pJEkTONIcrEWHUaF8bq8Ak7aReSzJ5FuMfFRPCerhCd5-wlI0Ng7BHPZ7YUionF0g%3D%3D; SecureNetflixId=v%3D3%26mac%3DAQEAEQABABQSCrPxRU_iT0O-qmkH8wToXNnsdFiJDxI.%26dt%3D1755167206734; NetflixId=v%3D3%26ct%3DBgjHlOvcAxLAAdfyENKgcHc5SmwLLiEF8Nv4Vc9CFC191IXWBDTaxdjUurRx1sVnnMf91k0L34XOHcexZLYsqizlcUpSNgigu1RjSY0VNp9WyQ3T8aKg7jRVXoRp1eVT9_xcVOtvbpe-LdO5GWNGon8I2lzh58aagJxTz-ECV8eKW7sSTvpWV9j_nQHP48hi38vffzqCMBLdmIC_TvB411kq3SMbalHJDfnmMG2EsziSYH-r2k47jqLNWx4g0LmPQ_M3vHn4_frBGxgGIg4KDNvagOU3k1bDAwjmWQ..; OptanonConsent=isGpcEnabled=0&datestamp=Thu+Aug+14+2025+11%3A27%3A22+GMT%2B0100+(West+Africa+Standard+Time)&version=202506.1.0&browserGpcFlag=1&isIABGlobal=false&hosts=&consentId=86086d9f-df6f-40aa-8f73-6db158b0bf46&interactionCount=0&isAnonUser=1&landingPath=https%3A%2F%2Fwww.netflix.com%2Fsignup%2F&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1; sawContext=true',
    
    // AuthURL personnalisé
    authURL: 'c1.1755167206419.AgiMlOvcAxIgiwRrZHLkx4IzxQFQw5QHkv1uZ2QSEeNcdx7aStj1uf4YAg==',
    
    // Paramètres du plan (peut être modifié)
    param: '{"flow":"signupSimplicity","mode":"planSelection","action":"planSelectionAction","fields":{"planChoice":{"value":"4120"},"previousMode":"planSelectionWithContext"}}',
    
    // ID de requête unique
    requestId: 'eeeb0141c9054f75b3407dd8cd949cc5',
    
    // Paramètres de query personnalisés (optionnel)
    queryParams: {
      landingURL: '/signup/planform',
      languages: 'en-US'
    },
    
    // Données de formulaire personnalisées (optionnel)
    formData: {
      tracingId: 'v7287ca98',
      tracingGroupId: 'www.netflix.com'
    }
  };

  try {
    console.log('🚀 Test de l\'endpoint Netflix...');
    console.log('URL:', serverUrl);
    console.log('Données envoyées:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('\n📊 Résultat:');
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    
    if (result.success) {
      console.log('✅ Réponse Netflix reçue avec succès!');
      console.log('Netflix Status:', result.status);
      console.log('Netflix Headers:', Object.keys(result.headers).join(', '));
      console.log('Netflix Data:', typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : result.data);
    } else {
      console.log('❌ Erreur lors de l\'appel Netflix:');
      console.log('Message:', result.message);
      console.log('Error:', result.error);
    }

  } catch (error) {
    console.error('💥 Erreur lors du test:', error.message);
  }
}

// Exemple d'utilisation simple (sans cookies)
async function testSimpleCall() {
  const serverUrl = 'http://localhost:3000/api/netflix/path-evaluator';
  
  console.log('\n🔄 Test simple sans cookies...');
  
  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        param: '{"flow":"signupSimplicity","mode":"planSelection","action":"planSelectionAction","fields":{"planChoice":{"value":"4120"},"previousMode":"planSelectionWithContext"}}'
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Result:', result.success ? '✅ Success' : '❌ Failed');
    
    if (!result.success) {
      console.log('Error:', result.message);
    }

  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

// Exécuter les tests
if (require.main === module) {
  console.log('🧪 Tests de l\'endpoint Netflix API\n');
  
  // Test avec cookies complets
  testNetflixEndpoint()
    .then(() => {
      // Test simple
      return testSimpleCall();
    })
    .then(() => {
      console.log('\n✨ Tests terminés!');
    })
    .catch(error => {
      console.error('Erreur générale:', error);
    });
}

module.exports = { testNetflixEndpoint, testSimpleCall };
