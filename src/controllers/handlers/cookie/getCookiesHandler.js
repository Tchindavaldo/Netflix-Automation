const cookieService = require("../../../services/netflix/cookie/cookieService");

/**
 * Gestionnaire pour récupérer les cookies de la session
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getCookiesHandler = async (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.headers["x-session-id"];

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message:
          "ID de session requis. Démarrez d'abord une session avec /api/netflix/session/start",
      });
    }

    const result = cookieService.getCookies(sessionId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json({
      success: true,
      sessionId,
      active: result.active,
      cookies: result.cookies,
      lastUpdated: result.lastUpdated,
    });
  } catch (error) {
    // console.error("Erreur dans le gestionnaire getCookies:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération des cookies",
      error: error.toString(),
    });
  }
};

module.exports = getCookiesHandler;
