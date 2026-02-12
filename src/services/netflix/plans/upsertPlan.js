const { db } = require('../../../config/firebase');

const collectionName = 'netflix_plans';

/**
 * Crée ou met à jour un plan
 */
const upsertPlan = async (planId, planData) => {
    try {
        await db.collection(collectionName).doc(planId).set({
            ...planData,
            updated_at: new Date().toISOString()
        }, { merge: true });
        return { id: planId, ...planData };
    } catch (error) {
        console.error('Erreur upsertPlan:', error);
        throw error;
    }
};

module.exports = upsertPlan;
