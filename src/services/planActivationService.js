const { db } = require('../config/firebase');

/**
 * Service pour la gestion des activations de plans Netflix dans Firebase
 */
const planActivationService = {
  /**
   * Créer une nouvelle activation
   */
  createActivation: async (activationData) => {
    try {
      const docRef = await db.collection('plan_activation').add(activationData);
      
      // Récupérer le document créé avec son ID
      const createdDoc = await docRef.get();
      const result = {
        id: docRef.id,
        ...createdDoc.data()
      };

      console.log(`✅ Activation créée avec l'ID: ${docRef.id}`);
      return result;

    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'activation:', error);
      throw new Error(`Erreur lors de la création de l'activation: ${error.message}`);
    }
  },

  /**
   * Récupérer une activation par ID
   */
  getActivationById: async (activationId) => {
    try {
      const doc = await db.collection('plan_activation').doc(activationId).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      };

    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'activation:', error);
      throw new Error(`Erreur lors de la récupération de l'activation: ${error.message}`);
    }
  },

  /**
   * Récupérer toutes les activations d'un utilisateur
   */
  getActivationsByUser: async (userId, options = {}) => {
    try {
      const { limit = 10, offset = 0 } = options;
      
      let query = db.collection('plan_activation')
        .where('userId', '==', userId)
        .orderBy('dateCreation', 'desc');

      // Compter le total
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Appliquer la pagination
      if (offset > 0) {
        query = query.offset(offset);
      }
      query = query.limit(limit);

      const snapshot = await query.get();
      const activations = [];

      snapshot.forEach(doc => {
        activations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return {
        activations,
        total
      };

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des activations utilisateur:', error);
      throw new Error(`Erreur lors de la récupération des activations: ${error.message}`);
    }
  },

  /**
   * Mettre à jour une activation
   */
  updateActivation: async (activationId, updateData) => {
    try {
      const docRef = db.collection('plan_activation').doc(activationId);
      
      // Vérifier si le document existe
      const doc = await docRef.get();
      if (!doc.exists) {
        return null;
      }

      // Mettre à jour le document
      await docRef.update(updateData);

      // Récupérer le document mis à jour
      const updatedDoc = await docRef.get();
      const result = {
        id: docRef.id,
        ...updatedDoc.data()
      };

      console.log(`✅ Activation ${activationId} mise à jour`);
      return result;

    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'activation:', error);
      throw new Error(`Erreur lors de la mise à jour de l'activation: ${error.message}`);
    }
  },

  /**
   * Supprimer une activation
   */
  deleteActivation: async (activationId) => {
    try {
      const docRef = db.collection('plan_activation').doc(activationId);
      
      // Vérifier si le document existe
      const doc = await docRef.get();
      if (!doc.exists) {
        return null;
      }

      // Supprimer le document
      await docRef.delete();

      console.log(`✅ Activation ${activationId} supprimée`);
      return true;

    } catch (error) {
      console.error('❌ Erreur lors de la suppression de l\'activation:', error);
      throw new Error(`Erreur lors de la suppression de l'activation: ${error.message}`);
    }
  },

  /**
   * Récupérer toutes les activations avec filtres et pagination
   */
  getAllActivations: async (options = {}) => {
    try {
      const { limit = 10, offset = 0, filters = {} } = options;
      
      let query = db.collection('plan_activation');

      // Appliquer les filtres
      if (filters.statut) {
        query = query.where('statut', '==', filters.statut);
      }

      // Ordonner par date de création (plus récent en premier)
      query = query.orderBy('dateCreation', 'desc');

      // Compter le total
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Appliquer la pagination
      if (offset > 0) {
        query = query.offset(offset);
      }
      query = query.limit(limit);

      const snapshot = await query.get();
      const activations = [];

      snapshot.forEach(doc => {
        activations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return {
        activations,
        total
      };

    } catch (error) {
      console.error('❌ Erreur lors de la récupération de toutes les activations:', error);
      throw new Error(`Erreur lors de la récupération des activations: ${error.message}`);
    }
  },

  /**
   * Récupérer les activations par statut
   */
  getActivationsByStatus: async (statut, options = {}) => {
    try {
      const { limit = 10, offset = 0 } = options;
      
      let query = db.collection('plan_activation')
        .where('statut', '==', statut)
        .orderBy('dateCreation', 'desc');

      // Compter le total
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Appliquer la pagination
      if (offset > 0) {
        query = query.offset(offset);
      }
      query = query.limit(limit);

      const snapshot = await query.get();
      const activations = [];

      snapshot.forEach(doc => {
        activations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return {
        activations,
        total
      };

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des activations par statut:', error);
      throw new Error(`Erreur lors de la récupération des activations: ${error.message}`);
    }
  },

  /**
   * Mettre à jour le statut d'une activation
   */
  updateActivationStatus: async (activationId, nouveauStatut) => {
    try {
      const updateData = {
        statut: nouveauStatut,
        dateModification: new Date().toISOString()
      };

      return await planActivationService.updateActivation(activationId, updateData);

    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du statut:', error);
      throw new Error(`Erreur lors de la mise à jour du statut: ${error.message}`);
    }
  }
};

module.exports = planActivationService;
