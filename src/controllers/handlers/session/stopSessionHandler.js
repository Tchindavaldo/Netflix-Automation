const stopSession = require('../../../services/netflix/session/stopSession');

/**
 * Gestionnaire pour arrêter une session Netflix
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const stopSessionHandler = async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.query.sessionId || req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "ID de session requis. Utilisez le paramètre 'sessionId', le corps de la requête ou l'en-tête 'X-Session-Id'"
      });
    }

    // console.log(`Arrêt de la session Netflix (ID: ${sessionId})...`);
    const result = await stopSession(sessionId);
    
    if (!result.success) {
      const statusCode = result.message === "Session introuvable ou expirée" ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: result.message || "Échec de l'arrêt de la session",
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      sessionId,
      message: result.message || "Session arrêtée avec succès"
    });
  } catch (error) {
    console.error("Erreur dans le gestionnaire stopSession:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de l'arrêt de la session",
      error: error.toString()
    });
  }
};

module.exports = stopSessionHandler;
