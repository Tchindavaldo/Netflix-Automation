const { NetflixSessionManager } = require('../../../services/netflix/NetflixSessionManager');

/**
 * Handler pour obtenir toutes les sessions actives
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getAllActiveSessions = async (req, res) => {
  try {
    // console.log('📋 Récupération de toutes les sessions actives...');

    const activeSessions = NetflixSessionManager.getAllActiveSessions();
    
    const sessionsList = Array.from(activeSessions.entries()).map(([sessionId, sessionData]) => ({
      sessionId,
      createdAt: sessionData.createdAt,
      lastActivity: sessionData.lastActivity,
      url: sessionData.url,
      isActive: sessionData.isActive
    }));

    // console.log(`✅ ${sessionsList.length} session(s) active(s) trouvée(s)`);

    return res.status(200).json({
      success: true,
      count: sessionsList.length,
      sessions: sessionsList
    });

  } catch (error) {
    // console.error('❌ Erreur lors de la récupération des sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des sessions actives',
      error: error.message
    });
  }
};

/**
 * Handler pour fermer toutes les sessions actives
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const closeAllSessions = async (req, res) => {
  try {
    // console.log('🔒 Fermeture de toutes les sessions actives...');

    const activeSessions = NetflixSessionManager.getAllActiveSessions();
    const sessionIds = Array.from(activeSessions.keys());
    
    if (sessionIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Aucune session active à fermer',
        closed: 0
      });
    }

    // console.log(`📊 ${sessionIds.length} session(s) à fermer...`);

    let closedCount = 0;
    let failedCount = 0;
    const results = [];

    for (const sessionId of sessionIds) {
      try {
        await NetflixSessionManager.closeSession(sessionId);
        closedCount++;
        results.push({
          sessionId,
          status: 'closed',
          success: true
        });
        // console.log(`✅ Session ${sessionId} fermée`);
      } catch (error) {
        failedCount++;
        results.push({
          sessionId,
          status: 'failed',
          success: false,
          error: error.message
        });
        // console.error(`❌ Échec fermeture session ${sessionId}:`, error.message);
      }
    }

    // console.log(`✅ Fermeture terminée: ${closedCount} succès, ${failedCount} échecs`);

    return res.status(200).json({
      success: true,
      message: `${closedCount} session(s) fermée(s) avec succès`,
      closed: closedCount,
      failed: failedCount,
      total: sessionIds.length,
      results
    });

  } catch (error) {
    // console.error('❌ Erreur lors de la fermeture des sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la fermeture des sessions',
      error: error.message
    });
  }
};

module.exports = {
  getAllActiveSessions,
  closeAllSessions
};
