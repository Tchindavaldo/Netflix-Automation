const axios = require('axios');
const selectors = require('../../../../selectors/subscription-selectors.json');

/**
 * Étape 9: Remplir le formulaire de paiement
 * @param {string} baseUrl - URL de base de l'API
 * @param {string} sessionId - ID de la session
 * @param {Object} cardInfo - Informations de la carte
 * @param {string} cardInfo.cardNumber - Numéro de carte
 * @param {string} cardInfo.expirationDate - Date d'expiration (MM/YY)
 * @param {string} cardInfo.securityCode - Code de sécurité
 * @param {string} cardInfo.cardholderName - Nom du titulaire
 * @returns {Promise<Object>} - Résultat du remplissage
 */
async function fillPaymentForm(baseUrl, sessionId, cardInfo) {
  try {
    console.log('📍 Étape 9: Remplissage du formulaire de paiement...');
    
    const response = await axios.post(`${baseUrl}/api/netflix/payment/form/fill`, {
      sessionId,
      fields: [
        {
          selector: selectors.paymentForm.cardNumber,
          value: cardInfo.cardNumber
        },
        {
          selector: selectors.paymentForm.expirationMonth,
          value: cardInfo.expirationDate
        },
        {
          selector: selectors.paymentForm.securityCode,
          value: cardInfo.securityCode
        },
        {
          selector: selectors.paymentForm.cardholderName,
          value: cardInfo.cardholderName
        },
        {
          selector: selectors.paymentForm.legalCheckbox,
          value: true
        }
      ]
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Échec du remplissage du formulaire de paiement');
    }

    console.log('✅ Formulaire de paiement rempli avec succès');
    
    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Erreur lors du remplissage du formulaire de paiement:', error.message);
    return {
      success: false,
      error: error.message,
      step: 'fillPaymentForm'
    };
  }
}

module.exports = fillPaymentForm;
