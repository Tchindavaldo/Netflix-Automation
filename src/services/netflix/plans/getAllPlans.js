const { db } = require('../../../config/firebase');
const seedDefaultPlans = require('./seedDefaultPlans');

const collectionName = 'netflix_plans';

/**
 * Récupère tous les plans depuis Firestore.
 * Si la collection est vide, elle est initialisée avec les données par défaut.
 */
const getAllPlans = async () => {
    try {
        let snapshot = await db.collection(collectionName).where('active', '==', true).get();
        
        if (snapshot.empty) {
            console.log('🌱 Initialisation des plans Netflix par défaut...');
            await seedDefaultPlans();
            snapshot = await db.collection(collectionName).where('active', '==', true).get();
        }

        const plans = [];
        snapshot.forEach(doc => {
            plans.push({ id: doc.id, ...doc.data() });
        });

        // Trier les plans par prix pour un affichage cohérent
        return plans.sort((a, b) => a.price - b.price);
    } catch (error) {
        console.error('Erreur getAllPlans:', error);
        throw error;
    }
};

module.exports = getAllPlans;
