const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

/**
 * Script pour autoriser l'application à accéder à Google Drive
 * et obtenir un refresh token OAuth2
 */

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.join(__dirname, '../config/oauth2-tokens.json');
const CREDENTIALS_PATH = path.join(__dirname, '../config/oauth2-credentials.json');

async function authorize() {
  try {
    console.log('🔐 Autorisation Google Drive OAuth2\n');

    // Lire les credentials OAuth2
    const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Générer l'URL d'autorisation
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('📱 Ouvrez cette URL dans votre navigateur :\n');
    console.log(authUrl);
    console.log('\n');

    // Demander le code d'autorisation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const code = await new Promise((resolve) => {
      rl.question('Entrez le code d\'autorisation que vous avez reçu : ', (answer) => {
        rl.close();
        resolve(answer);
      });
    });

    // Échanger le code contre un token
    console.log('\n⏳ Récupération du token...');
    const { tokens } = await oAuth2Client.getToken(code);
    
    // Sauvegarder les tokens
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    
    console.log('✅ Token sauvegardé dans:', TOKEN_PATH);
    console.log('\n📋 Tokens reçus:');
    console.log('   - Access Token: ✅');
    console.log('   - Refresh Token:', tokens.refresh_token ? '✅' : '❌');
    
    if (!tokens.refresh_token) {
      console.log('\n⚠️  ATTENTION: Pas de refresh_token reçu!');
      console.log('   Supprimez l\'accès dans https://myaccount.google.com/permissions');
      console.log('   Puis relancez ce script.');
    } else {
      console.log('\n🎉 Autorisation réussie!');
      console.log('   Vous pouvez maintenant utiliser l\'upload Google Drive.');
      console.log('\n📝 Configuration à ajouter dans .env.dev:');
      console.log(`GOOGLE_DRIVE_CLIENT_ID="${client_id}"`);
      console.log(`GOOGLE_DRIVE_CLIENT_SECRET="${client_secret}"`);
      console.log(`GOOGLE_DRIVE_REFRESH_TOKEN="${tokens.refresh_token}"`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'autorisation:', error.message);
    
    if (error.code === 'ENOENT') {
      console.log('\n💡 Le fichier oauth2-credentials.json est manquant.');
      console.log('   Créez-le d\'abord dans Google Cloud Console:');
      console.log('   1. https://console.cloud.google.com/apis/credentials');
      console.log('   2. Créer des identifiants → ID client OAuth');
      console.log('   3. Application de bureau');
      console.log('   4. Télécharger le JSON');
      console.log(`   5. Sauvegarder dans: ${CREDENTIALS_PATH}`);
    }
    
    process.exit(1);
  }
}

// Lancer l'autorisation
authorize();
