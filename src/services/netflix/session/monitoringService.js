const cookieService = require("../cookie/cookieService");

/**
 * Service pour le monitoring des sessions Netflix
 * Gère la surveillance des cookies et le keep-alive
 */
class MonitoringService {
  constructor() {
    this.intervals = new Map(); // sessionId -> { cookieInterval, keepAliveInterval }
  }

  /**
   * Démarre le monitoring complet pour une session
   * @param {string} sessionId - ID de la session
   * @param {Object} driver - Driver Selenium
   */
  startMonitoring(sessionId, driver) {
    this.startCookieMonitoring(sessionId);
    this.startKeepAlive(sessionId, driver);
  }

  /**
   * Démarre la surveillance automatique des cookies (toutes les 30 secondes)
   * @param {string} sessionId - ID de la session
   */
  startCookieMonitoring(sessionId) {
    // Surveillance désactivée à la demande de l'utilisateur
    // console.log("👀 Démarrage surveillance cookies (toutes les 30s)...");
  }

  /**
   * Démarre le keep-alive de la session (toutes les 5 minutes)
   * @param {string} sessionId - ID de la session
   * @param {Object} driver - Driver Selenium
   */
  startKeepAlive(sessionId, driver) {
    // console.log("💓 Démarrage keep-alive session (toutes les 5 minutes)...");

    // const keepAliveInterval = setInterval(async () => {
    //   try {
    //     if (driver) {
    //       const currentUrl = await driver.getCurrentUrl();
    //       if (!currentUrl.includes("netflix.com")) {
    //         // console.log("🔄 Retour vers Netflix...");
    //         await driver.get("https://www.netflix.com/signup");
    //         await driver.sleep(1000);
    //       }
    //       await driver.executeScript("document.title = document.title;");
    //       // console.log("💓 Session maintenue active");
    //     }
    //   } catch (e) {
    //     console.error("⚠️ Erreur keep-alive:", e.message);
    //   }
    // }, 300000);

    // if (!this.intervals.has(sessionId)) {
    //   this.intervals.set(sessionId, {});
    // }
    // this.intervals.get(sessionId).keepAliveInterval = keepAliveInterval;
  }

  /**
   * Arrête le monitoring pour une session
   * @param {string} sessionId - ID de la session
   */
  stopMonitoring(sessionId) {
    const intervals = this.intervals.get(sessionId);
    if (intervals) {
      if (intervals.cookieInterval) {
        clearInterval(intervals.cookieInterval);
        // console.log("🛑 Surveillance cookies arrêtée");
      }
      if (intervals.keepAliveInterval) {
        clearInterval(intervals.keepAliveInterval);
        // console.log("🛑 Keep-alive arrêté");
      }
      this.intervals.delete(sessionId);
    }
  }

  /**
   * Arrête tous les monitorings
   */
  stopAllMonitoring() {
    for (const [sessionId] of this.intervals) {
      this.stopMonitoring(sessionId);
    }
  }

  /**
   * Vérifie si une session a un monitoring actif
   * @param {string} sessionId - ID de la session
   * @returns {Object} État du monitoring
   */
  isMonitoring(sessionId) {
    const intervals = this.intervals.get(sessionId);
    return {
      cookieMonitoring: !!(intervals && intervals.cookieInterval),
      keepAlive: !!(intervals && intervals.keepAliveInterval),
    };
  }
}

// Exporte une instance singleton
module.exports = new MonitoringService();
