const axios = require('axios');

/**
 * Étape 1: Démarrer une session Netflix
 * @param {string} baseUrl - URL de base de l'API
 * @returns {Promise<Object>} - Résultat avec sessionId
 */
async function startSession(baseUrl) {
  try {
    // console.log('📍 Étape 1: Démarrage de la session Netflix...');
    
    const response = await axios.post(`${baseUrl}/api/netflix/session/start`);
    
    if (!response.data.success || !response.data.sessionId) {
      throw new Error(response.data.message || 'Échec du démarrage de la session');
    }

    // console.log(`✅ Session démarrée avec succès: ${response.data.sessionId}`);
    
    return {
      success: true,
      sessionId: response.data.sessionId,
      data: response.data
    };

  } catch (error) {
    // console.error('❌ Erreur lors du démarrage de la session:', error.message);
    return {
      success: false,
      error: error.message,
      step: 'startSession'
    };
  }
}

module.exports = startSession;
