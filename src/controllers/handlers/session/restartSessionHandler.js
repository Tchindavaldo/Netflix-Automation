const restartSession = require('../../../services/netflix/session/restartSession');

/**
 * Gestionnaire pour redémarrer une session Netflix
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const restartSessionHandler = async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.query.sessionId || req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "ID de session requis. Utilisez le paramètre 'sessionId', le corps de la requête ou l'en-tête 'X-Session-Id'"
      });
    }

    console.log(`Redémarrage de la session Netflix (ID: ${sessionId})...`);
    const result = await restartSession(sessionId);
    
    if (!result.success) {
      const statusCode = result.message === "Session introuvable ou expirée" ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: result.message || "Échec du redémarrage de la session",
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      message: result.message || "Session redémarrée avec succès",
      oldSessionId: sessionId,
      newSessionId: result.sessionId
    });
  } catch (error) {
    console.error("Erreur dans le gestionnaire restartSession:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors du redémarrage de la session",
      error: error.toString()
    });
  }
};

module.exports = restartSessionHandler;
