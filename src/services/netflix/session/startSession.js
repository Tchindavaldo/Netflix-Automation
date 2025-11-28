const { NetflixSessionManager } = require("../NetflixSessionManager");
const browserService = require("./browserService");
const monitoringService = require("./monitoringService");

/**
 * Service pour démarrer une nouvelle session Netflix
 * @returns {Promise<Object>} Résultat de l'opération
 */
const startSession = async () => {
  try {
    const sessionManager = NetflixSessionManager.getInstance();

    // Créer une nouvelle session
    const sessionId = await sessionManager.createSession();
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      throw new Error("Échec de la création de la session");
    }

    // Initialiser le driver
    const driver = await browserService.initializeDriver();
    session.driver = driver;

    // Démarrer le navigateur Netflix
    const result = await browserService.startNetflixBrowser(sessionId, driver);

    if (!result.success) {
      await sessionManager.closeSession(sessionId);
      return {
        success: false,
        message: result.message || "Échec du démarrage de la session",
      };
    }

    // Activer la session
    session.isActive = true;

    // Démarrer le monitoring (cookies + keep-alive)
    monitoringService.startMonitoring(sessionId, driver);

    return {
      success: true,
      sessionId,
      message: "Session démarrée avec succès",
      url: result.url,
    };
  } catch (error) {
    // console.error("Erreur dans le service startSession:", error);
    return {
      success: false,
      message: error.message || "Erreur lors du démarrage de la session",
      error: error.toString(),
    };
  }
};

module.exports = startSession;
