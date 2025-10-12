const { db } = require('../config/firebase');

/**
 * Service pour la gestion des erreurs d'abonnement dans Firebase
 */
const subscriptionErrorService = {
  /**
   * Enregistrer une erreur d'abonnement
   * @param {Object} errorData - Données de l'erreur
   * @returns {Promise<Object>} - Erreur enregistrée avec son ID
   */
  logError: async (errorData) => {
    try {
      const errorRecord = {
        ...errorData,
        timestamp: new Date().toISOString(),
        dateCreation: new Date().toISOString()
      };

      const docRef = await db.collection('subscription_errors').add(errorRecord);
      
      const createdDoc = await docRef.get();
      const result = {
        id: docRef.id,
        ...createdDoc.data()
      };

      console.log(`✅ Erreur d'abonnement enregistrée avec l'ID: ${docRef.id}`);
      return result;

    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement de l\'erreur d\'abonnement:', error);
      throw new Error(`Erreur lors de l'enregistrement: ${error.message}`);
    }
  },

  /**
   * Récupérer les erreurs par planActivationId
   * @param {string} planActivationId - ID de l'activation
   * @returns {Promise<Array>} - Liste des erreurs
   */
  getErrorsByActivationId: async (planActivationId) => {
    try {
      const snapshot = await db.collection('subscription_errors')
        .where('planActivationId', '==', planActivationId)
        .orderBy('timestamp', 'desc')
        .get();

      const errors = [];
      snapshot.forEach(doc => {
        errors.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return errors;

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des erreurs:', error);
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }
  }
};

module.exports = subscriptionErrorService;
