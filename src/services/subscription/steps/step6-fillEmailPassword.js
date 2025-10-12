const axios = require('axios');
const selectors = require('../../../../selectors/subscription-selectors.json');

/**
 * Étape 6: Remplir le formulaire email/mot de passe
 * @param {string} baseUrl - URL de base de l'API
 * @param {string} sessionId - ID de la session
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe de l'utilisateur
 * @returns {Promise<Object>} - Résultat du remplissage
 */
async function fillEmailPassword(baseUrl, sessionId, email, password) {
  try {
    console.log('📍 Étape 6: Remplissage email et mot de passe...');
    
    const response = await axios.post(`${baseUrl}/api/netflix/form/fill`, {
      sessionId,
      fields: [
        {
          selector: selectors.authentication.email,
          value: email,
          type: 'input'
        },
        {
          selector: selectors.authentication.password,
          value: password,
          type: 'input'
        }
      ]
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Échec du remplissage du formulaire');
    }

    console.log('✅ Email et mot de passe remplis avec succès');
    
    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Erreur lors du remplissage email/mot de passe:', error.message);
    return {
      success: false,
      error: error.message,
      step: 'fillEmailPassword'
    };
  }
}

module.exports = fillEmailPassword;
