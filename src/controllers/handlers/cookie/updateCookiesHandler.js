const cookieService = require("../../../services/netflix/cookie/cookieService");

/**
 * Gestionnaire pour mettre à jour les cookies de la session
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const updateCookiesHandler = async (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.headers["x-session-id"];

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message:
          "ID de session requis. Démarrez d'abord une session avec /api/netflix/session/start",
      });
    }

    const result = await cookieService.updateCookies(sessionId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.status(200).json({
      success: true,
      sessionId,
      cookies: result.cookies,
      count: result.count,
      message: "Cookies mis à jour avec succès",
    });
  } catch (error) {
    console.error("Erreur dans le gestionnaire updateCookies:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la mise à jour des cookies",
      error: error.toString(),
    });
  }
};

module.exports = updateCookiesHandler;
