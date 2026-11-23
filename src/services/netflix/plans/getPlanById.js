const { db } = require('../../../config/firebase');

const collectionName = 'netflix_plans';

/**
 * Récupère un plan spécifique par son ID
 */
const getPlanById = async (planId) => {
    try {
        const doc = await db.collection(collectionName).doc(planId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error('Erreur getPlanById:', error);
        throw error;
    }
};

module.exports = getPlanById;
