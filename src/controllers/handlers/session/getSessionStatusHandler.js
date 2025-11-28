const getSessionStatus = require('../../../services/netflix/session/getSessionStatus');

/**
 * Gestionnaire pour obtenir le statut d'une session Netflix
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getSessionStatusHandler = async (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "ID de session requis. Utilisez le paramètre 'sessionId' ou l'en-tête 'X-Session-Id'"
      });
    }

    const result = await getSessionStatus(sessionId);
    
    if (!result.success) {
      const statusCode = result.message === "Session introuvable ou expirée" ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: result.message || "Erreur lors de la récupération du statut de la session",
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      sessionId: result.sessionId,
      active: result.active,
      cookiesCount: result.cookiesCount,
      lastCookieUpdate: result.lastCookieUpdate,
      monitoringActive: result.monitoringActive,
      keepAliveActive: result.keepAliveActive,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // console.error("Erreur dans le gestionnaire getSessionStatus:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération du statut de la session",
      error: error.toString()
    });
  }
};

module.exports = getSessionStatusHandler;
