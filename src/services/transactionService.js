const { db } = require('../config/firebase');

/**
 * Service pour la gestion de l'historique des transactions financières
 */
const transactionService = {
  /**
   * Enregistrer une nouvelle transaction
   */
  createTransaction: async (data) => {
    try {
      const transactionData = {
        ...data,
        dateCreation: new Date().toISOString(),
        dateModification: new Date().toISOString()
      };
      
      const docRef = await db.collection('transactions').add(transactionData);
      return { id: docRef.id, ...transactionData };
    } catch (error) {
      throw new Error(`Erreur lors de la création de la transaction: ${error.message}`);
    }
  },

  /**
   * Récupérer les transactions d'une activation
   */
  getTransactionsByActivation: async (activationId) => {
    try {
      const snapshot = await db.collection('transactions')
        .where('planActivationId', '==', activationId)
        .orderBy('dateCreation', 'desc')
        .get();
      
      const transactions = [];
      snapshot.forEach(doc => {
        transactions.push({ id: doc.id, ...doc.data() });
      });
      return transactions;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des transactions: ${error.message}`);
    }
  },

  /**
   * Récupérer les transactions d'un utilisateur
   */
  getTransactionsByUser: async (userId, options = {}) => {
    try {
      const { limit = 20, offset = 0 } = options;
      
      let query = db.collection('transactions')
        .where('userId', '==', userId)
        .orderBy('dateCreation', 'desc');

      // Compter le total
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Calculer le montant total dépensé
      let totalSpent = 0;
      totalSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'success' || data.status === 'completed') {
          totalSpent += parseFloat(data.amount || 0);
        }
      });

      // Appliquer la pagination
      if (offset > 0) {
        query = query.offset(offset);
      }
      query = query.limit(limit);

      const snapshot = await query.get();
      const transactions = [];

      snapshot.forEach(doc => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return {
        transactions,
        total,
        totalSpent
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des transactions utilisateur: ${error.message}`);
    }
  },

  /**
   * Récupérer une transaction par son ID externe
   */
  getTransactionByExternalId: async (externalId) => {
    try {
      const snapshot = await db.collection('transactions')
        .where('externalTransactionId', '==', externalId)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Erreur lors de la recherche de la transaction: ${error.message}`);
    }
  },

  /**
   * Mettre à jour le statut d'une transaction via son ID externe
   */
  updateTransactionStatusByExternalId: async (externalId, newStatus) => {
    try {
      const snapshot = await db.collection('transactions')
        .where('externalTransactionId', '==', externalId)
        .limit(1)
        .get();
      
      if (snapshot.empty) return false;
      
      const docRef = snapshot.docs[0].ref;
      await docRef.update({
        status: newStatus,
        dateModification: new Date().toISOString()
      });
      return true;
    } catch (error) {
       throw new Error(`Erreur lors de la mise à jour de la transaction: ${error.message}`);
    }
  }
};

module.exports = transactionService;
