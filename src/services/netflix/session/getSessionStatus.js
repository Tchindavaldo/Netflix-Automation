const { NetflixSessionManager } = require("../NetflixSessionManager");
const monitoringService = require("./monitoringService");

/**
 * Service pour obtenir le statut d'une session Netflix
 * @param {string} sessionId - L'ID de la session
 * @returns {Promise<Object>} Statut de la session
 */
const getSessionStatus = async (sessionId) => {
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
        message: "Session introuvable ou expirée",
      };
    }

    // Récupérer l'état du monitoring
    const monitoring = monitoringService.isMonitoring(sessionId);

    return {
      success: true,
      sessionId,
      status: {
        isActive: session.isActive,
        hasDriver: !!session.driver,
        hasCookies: Object.keys(session.cookies.individual || {}).length > 0,
        cookieCount: Object.keys(session.cookies.individual || {}).length,
        lastCookieUpdate: session.cookies.lastUpdated,
        monitoringActive: monitoring.cookieMonitoring,
        keepAliveActive: monitoring.keepAlive,
        createdAt: session.metadata.createdAt,
        lastActivity: session.lastActivity,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Erreur dans le service getSessionStatus:", error);
    return {
      success: false,
      message:
        error.message ||
        "Erreur lors de la récupération du statut de la session",
      error: error.toString(),
    };
  }
};

module.exports = getSessionStatus;
