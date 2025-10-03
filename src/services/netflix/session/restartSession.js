const { NetflixSessionManager } = require("../NetflixSessionManager");
const startSession = require("./startSession");
const stopSession = require("./stopSession");

/**
 * Service pour redémarrer une session Netflix
 * @param {string} sessionId - L'ID de la session à redémarrer
 * @returns {Promise<Object>} Résultat de l'opération
 */
const restartSession = async (sessionId) => {
  if (!sessionId) {
    return {
      success: false,
      message: "ID de session manquant",
    };
  }

  try {
    const sessionManager = NetflixSessionManager.getInstance();

    // Vérifier que la session existe
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        message: "Session introuvable ou expirée",
      };
    }

    // D'abord arrêter la session existante
    const stopResult = await stopSession(sessionId);

    if (!stopResult.success) {
      return {
        success: false,
        message:
          stopResult.message || "Échec de l'arrêt de la session existante",
        error: stopResult.error,
      };
    }

    // Puis démarrer une nouvelle session
    const startResult = await startSession();

    if (!startResult.success) {
      return {
        success: false,
        message: startResult.message || "Échec du redémarrage de la session",
        error: startResult.error,
      };
    }

    return {
      success: true,
      sessionId: startResult.sessionId,
      message: "Session redémarrée avec succès",
    };
  } catch (error) {
    console.error("Erreur dans le service restartSession:", error);
    return {
      success: false,
      message: error.message || "Erreur lors du redémarrage de la session",
      error: error.toString(),
    };
  }
};

module.exports = restartSession;
