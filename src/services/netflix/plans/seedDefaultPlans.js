const { db } = require('../../../config/firebase');

const collectionName = 'netflix_plans';

/**
 * Initialise les plans par défaut
 */
const seedDefaultPlans = async () => {
    const defaultPlans = [
        {
            id: 'mobile',
            name: 'Mobile',
            title: 'Plan Mobile - Parfait pour les déplacements',
            summary: 'Regardez sur votre téléphone et tablette avec une qualité 480p. Parfait pour les trajets et les petits écrans.',
            price: 3000,
            currency: 'XAF',
            quality: 'Bonne',
            resolution: '480p',
            support: 'Téléphone, tablette',
            simultaneous: 1,
            downloads: 1,
            active: true
        },
        {
            id: 'basic',
            name: 'Basic',
            title: 'Plan Basic - Idéal pour débuter',
            summary: 'Profitez de vos contenus en HD 720p sur tous vos appareils. Un excellent point de départ.',
            price: 5000,
            currency: 'XAF',
            quality: 'Bonne',
            resolution: '720p HD',
            support: 'TV, ordinateur, téléphone, tablette',
            simultaneous: 1,
            downloads: 1,
            active: true
        },
        {
            id: 'standard',
            name: 'Standard',
            title: 'Plan Standard - Le meilleur rapport qualité-prix',
            summary: 'Streaming Full HD 1080p sur 2 écrans simultanément. Idéal pour les couples et petites familles.',
            price: 7500,
            currency: 'XAF',
            quality: 'Très bonne',
            resolution: '1080p Full HD',
            support: 'TV, ordinateur, téléphone, tablette',
            simultaneous: 2,
            downloads: 2,
            active: true
        },
        {
            id: 'premium',
            name: 'Premium',
            title: 'Plan Premium - L\'expérience ultime',
            summary: 'Qualité 4K Ultra HD + HDR sur 4 écrans simultanés. L\'expérience premium pour toute la famille.',
            price: 10000,
            currency: 'XAF',
            quality: 'Exceptionnelle',
            resolution: '4K Ultra HD',
            support: 'TV, ordinateur, téléphone, tablette',
            simultaneous: 4,
            downloads: 6,
            active: true
        }
    ];

    try {
        const batch = db.batch();
        defaultPlans.forEach(plan => {
            const { id, ...data } = plan;
            const ref = db.collection(collectionName).doc(id);
            batch.set(ref, { ...data, created_at: new Date().toISOString() });
        });

        await batch.commit();
        return true;
    } catch (error) {
        console.error('Erreur seedDefaultPlans:', error);
        throw error;
    }
};

module.exports = seedDefaultPlans;
