const axios = require('axios');
const selectors = require('../../../../selectors/subscription-selectors.json');

/**
 * Étape 3: Sélectionner le plan Netflix
 * @param {string} baseUrl - URL de base de l'API
 * @param {string} sessionId - ID de la session
 * @param {string} planType - Type de plan (mobile, basic, standard, premium)
 * @returns {Promise<Object>} - Résultat de la sélection
 */
async function selectPlan(baseUrl, sessionId, planType) {
  try {
    console.log(`📍 Étape 3: Sélection du plan ${planType}...`);
    
    // Récupérer le sélecteur correspondant au type de plan
    const planSelector = selectors.planSelection[planType.toLowerCase()];
    
    if (!planSelector) {
      throw new Error(`Type de plan inconnu: ${planType}`);
    }

    const response = await axios.post(`${baseUrl}/api/netflix/page/selectPlan`, {
      sessionId,
      planSelector
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Échec de la sélection du plan');
    }

    console.log(`✅ Plan ${planType} sélectionné avec succès`);
    
    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Erreur lors de la sélection du plan:', error.message);
    return {
      success: false,
      error: error.message,
      step: 'selectPlan'
    };
  }
}

module.exports = selectPlan;
