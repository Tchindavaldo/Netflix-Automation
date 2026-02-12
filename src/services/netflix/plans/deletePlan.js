const { db } = require('../../../config/firebase');

const collectionName = 'netflix_plans';

/**
 * Supprime (désactive) un plan
 */
const deletePlan = async (planId) => {
    try {
        await db.collection(collectionName).doc(planId).update({
            active: false,
            updated_at: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Erreur deletePlan:', error);
        throw error;
    }
};

module.exports = deletePlan;
