const { NetflixSessionManager } = require("../NetflixSessionManager");

// Liste des cookies Netflix importants
const NETFLIX_COOKIE_NAMES = [
  "NetflixId",
  "SecureNetflixId",
  "nfvdid",
  "flwssn",
  "gsid",
  "OptanonConsent",
  "sawContext",
  "memclid",
  "SecureNetflixIdv2",
  "NetflixLoco",
  "NetflixProfile",
  "NetflixSecureUI",
  "nftt",
  "nftt-dev",
  "falcor_visitor",
  "clSharedContext",
];

class CookieService {
  constructor() {
    this.sessionManager = NetflixSessionManager.getInstance();
  }

  /**
   * Met à jour les cookies depuis le navigateur
   * @param {string} sessionId - ID de la session
   * @returns {Promise<Object>} État des cookies mis à jour
   */
  async updateCookies(sessionId) {
    try {
      const session = this.sessionManager.getSession(sessionId);
      if (!session || !session.driver) {
        throw new Error("Session non valide ou expirée");
      }

      const browserCookies = await session.driver.manage().getCookies();
      const cookieString = browserCookies
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");

      const importantCookies = {};
      browserCookies.forEach((c) => {
        if (NETFLIX_COOKIE_NAMES.includes(c.name)) {
          importantCookies[c.name] = c.value;
        }
      });

      session.cookies = {
        cookieString,
        individual: importantCookies,
        raw: browserCookies,
        lastUpdated: new Date().toISOString(),
      };

      return {
        success: true,
        cookies: session.cookies,
        count: Object.keys(importantCookies).length,
      };
    } catch (error) {
      // console.error(
      //   "❌ Erreur lors de la mise à jour des cookies:",
      //   error.message,
      // );
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Récupère les cookies actuels d'une session
   * @param {string} sessionId - ID de la session
   * @returns {Object} État des cookies
   */
  getCookies(sessionId) {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        message: "Session non trouvée",
        cookies: { cookieString: "", individual: {}, raw: [] },
      };
    }

    const hasValidCookies =
      session.cookies &&
      session.cookies.cookieString &&
      session.cookies.individual;

    return {
      success: hasValidCookies,
      active: session.isActive,
      cookies: session.cookies || { cookieString: "", individual: {}, raw: [] },
      lastUpdated: session.cookies?.lastUpdated || null,
    };
  }

  /**
   * Supprime tous les cookies d'une session
   * @param {string} sessionId - ID de la session
   * @returns {Promise<Object>} Résultat de l'opération
   */
  async clearCookies(sessionId) {
    try {
      const session = this.sessionManager.getSession(sessionId);
      if (!session || !session.driver) {
        throw new Error("Session non valide ou expirée");
      }

      await session.driver.manage().deleteAllCookies();
      session.cookies = {
        cookieString: "",
        individual: {},
        raw: [],
        lastUpdated: new Date().toISOString(),
      };

      // console.log("🗑️ Cookies supprimés avec succès");

      return {
        success: true,
        message: "Cookies supprimés avec succès",
      };
    } catch (error) {
      // console.error(
      //   "❌ Erreur lors de la suppression des cookies:",
      //   error.message,
      // );
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

// Exporte une instance singleton du service
module.exports = new CookieService();
