const {
  NetflixSessionManager,
} = require("../../../services/netflix/NetflixSessionManager");
const { By } = require("selenium-webdriver");

/**
 * Gestionnaire pour obtenir les informations de la page actuelle
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getCurrentPageHandler = async (req, res) => {
  try {
    const sessionId =
      req.body.sessionId || req.query.sessionId || req.headers["x-session-id"];

    // Log pour déboguer
    // console.log("📥 Paramètres reçus:", {
    //   sessionId,
    // });

    // Validation du sessionId
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message:
          "ID de session requis. Démarrez d'abord une session avec /api/netflix/session/start",
      });
    }

    const sessionManager = NetflixSessionManager.getInstance();
    const session = sessionManager.getSession(sessionId);

    if (!session || !session.driver) {
      return res.status(404).json({
        success: false,
        message: "Session non trouvée ou expirée",
      });
    }

    const driver = session.driver;

    // console.log("🔍 Récupération de l'URL actuelle...");

    // Obtenir uniquement l'URL actuelle
    const currentUrl = await driver.getCurrentUrl();
    // console.log(`📍 URL: ${currentUrl}`);

    // console.log("✅ URL récupérée avec succès");

    res.status(200).json({
      success: true,
      sessionId,
      url: currentUrl,
      message: "URL récupérée avec succès",
    });
  } catch (error) {
    // console.error("Erreur dans le gestionnaire getCurrentPage:", error);
    res.status(500).json({
      success: false,
      message:
        error.message || "Erreur lors de la récupération des informations de la page",
      error: error.toString(),
    });
  }
};

module.exports = getCurrentPageHandler;
