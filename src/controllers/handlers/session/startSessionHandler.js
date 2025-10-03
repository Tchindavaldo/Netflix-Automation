const startSession = require('../../../services/netflix/session/startSession');

/**
 * Gestionnaire pour démarrer une session Netflix
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const startSessionHandler = async (req, res) => {
  const timeout = setTimeout(() => {
    res.status(408).json({
      success: false,
      message: "Délai d'attente dépassé lors du démarrage de la session"
    });
  }, 60000);

  try {
    console.log("Démarrage d'une nouvelle session Netflix...");
    const result = await startSession();
    
    clearTimeout(timeout);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || "Échec du démarrage de la session",
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      message: result.message || "Session démarrée avec succès",
      sessionId: result.sessionId
    });
  } catch (error) {
    clearTimeout(timeout);
    console.error("Erreur dans le gestionnaire startSession:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors du démarrage de la session",
      error: error.toString()
    });
  }
};

module.exports = startSessionHandler;
