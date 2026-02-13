const { db } = require('../../../config/firebase');
const { flattenNotifications } = require('../../../utils/flattenNotifications');

exports.getNotificationsService = async (userId) => {
  try {
    if (!userId) return { success: false, message: 'userId est requis' };

    // 1. Récupérer les notifications globales (target: all)
    const globalNotifsSnap = await db.collection('notification')
      .where('target', '==', 'all')
      .orderBy('updatedAt', 'desc')
      .get();

    // 2. Récupérer les notifications spécifiques à l'utilisateur
    const userNotifsSnap = await db.collection('notification')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();

    // Fusionner et trier par date
    const allNotif = [
      ...globalNotifsSnap.docs.map(doc => ({ idGroup: doc.id, ...doc.data() })),
      ...userNotifsSnap.docs.map(doc => ({ idGroup: doc.id, ...doc.data() }))
    ];

    allNotif.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Transformer le format groupé en liste plate pour le frontend
    const finalData = flattenNotifications(allNotif);

    return { 
      success: true, 
      data: finalData, 
      message: 'notifications récupérées avec succès' 
    };
  } catch (error) {
    console.error('❌ Erreur getNotificationsService:', error);
    return { success: false, message: error.message };
  }
};
