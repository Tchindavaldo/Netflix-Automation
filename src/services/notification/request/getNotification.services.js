const { db } = require('../../../config/firebase');

exports.getNotificationService = async (userId) => {
  try {
    if (!userId) return { success: false, message: 'userId est requis' };
    
    const snapshot = await db.collection('notification')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    const allNotif = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: allNotif, message: 'notifications récupérées avec succès' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
