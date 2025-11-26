const {
  NetflixSessionManager,
} = require("../../../services/netflix/NetflixSessionManager");

/**
 * Gestionnaire pour revenir en arrière dans l'historique du navigateur
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const goBackHandler = async (req, res) => {
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

    // console.log("🔙 Retour en arrière dans l'historique...");

    // URL avant de revenir en arrière
    const urlBefore = await driver.getCurrentUrl();
    // console.log(`📍 URL actuelle: ${urlBefore}`);

    // Revenir en arrière
    await driver.navigate().back();

    // Attendre que la navigation soit terminée
    await driver.sleep(2000);

    // URL après être revenu en arrière
    const urlAfter = await driver.getCurrentUrl();
    const title = await driver.getTitle();

    // console.log(`✅ Retour en arrière effectué: ${urlBefore} → ${urlAfter}`);

    res.status(200).json({
      success: true,
      sessionId,
      navigation: {
        before: urlBefore,
        after: urlAfter,
        changed: urlBefore !== urlAfter,
      },
      page: {
        url: urlAfter,
        title,
      },
      message: "Retour en arrière effectué avec succès",
    });
  } catch (error) {
    console.error("Erreur dans le gestionnaire goBack:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors du retour en arrière",
      error: error.toString(),
    });
  }
};

module.exports = goBackHandler;
