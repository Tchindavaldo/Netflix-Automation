const { NetflixSessionManager } = require("../NetflixSessionManager");
const monitoringService = require("./monitoringService");
const browserService = require("./browserService");

/**
 * Service pour arrêter une session Netflix
 * @param {string} sessionId - L'ID de la session à arrêter
 * @returns {Promise<Object>} Résultat de l'opération
 */
const stopSession = async (sessionId) => {
  if (!sessionId) {
    return {
      success: false,
      message: "ID de session manquant",
    };
  }

  try {
    const sessionManager = NetflixSessionManager.getInstance();
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return {
        success: false,
        message: "Session non trouvée",
      };
    }

    console.log("🛑 Fermeture de la session Netflix...");

    // Arrêter le monitoring (cookies + keep-alive)
    monitoringService.stopMonitoring(sessionId);

    // Fermer le driver
    if (session.driver) {
      await browserService.closeDriver(session.driver);
    }

    // Supprimer la session du gestionnaire
    await sessionManager.closeSession(sessionId);

    console.log("✅ Session fermée avec succès");

    return {
      success: true,
      message: "Session arrêtée avec succès",
    };
  } catch (error) {
    console.error("Erreur dans le service stopSession:", error);
    return {
      success: false,
      message: error.message || "Erreur lors de l'arrêt de la session",
      error: error.toString(),
    };
  }
};

module.exports = stopSession;
