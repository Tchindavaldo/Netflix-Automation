const { Builder } = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");
const cookieService = require("../cookie/cookieService");

/**
 * Service pour initialiser et gérer le navigateur Firefox pour Netflix
 */
class BrowserService {
  /**
   * Initialise le driver Selenium avec Firefox
   * @returns {Promise<Object>} Driver Selenium initialisé
   */
  static async initializeDriver() {
    try {
      // console.log("🔧 Initialisation du driver Selenium...");
      const options = new firefox.Options();
      const headless =
        String(process.env.HEADLESS || "true").toLowerCase() !== "false";

      if (headless) {
        try {
          options.headless();
        } catch {
          options.addArguments("--headless");
        }
      }

      options.addArguments("--no-sandbox");
      options.addArguments("--disable-dev-shm-usage");
      options.addArguments("--disable-web-security");
      options.addArguments("--disable-gpu");
      options.addArguments("--disable-extensions");
      options.addArguments("--disable-infobars");
      options.addArguments("--disable-notifications");

      const NETFLIX_UA =
        process.env.NETFLIX_UA ||
        "Mozilla/5.0 (X11; Linux x86_64; rv:117.0) Gecko/20100101 Firefox/117.0";
      options.addArguments(`--user-agent=${NETFLIX_UA}`);
      options.setPreference("general.useragent.override", NETFLIX_UA);

      const driver = await new Builder()
        .forBrowser("firefox")
        .setFirefoxOptions(options)
        .build();

      // Timeouts dynamiques selon l'environnement
      const implicitTimeout = parseInt(process.env.SELENIUM_IMPLICIT_TIMEOUT || 20000);
      const pageLoadTimeout = parseInt(process.env.SELENIUM_PAGE_LOAD_TIMEOUT || 20000);
      const scriptTimeout = parseInt(process.env.SELENIUM_SCRIPT_TIMEOUT || 30000);

      await driver.manage().setTimeouts({
        implicit: implicitTimeout,
        pageLoad: pageLoadTimeout,
        script: scriptTimeout,
      });

      // Window size only if not headless
      if (!headless) {
        await driver.manage().window().setRect({
          width: 1366,
          height: 768,
        });
      }

      try {
        const ua = await driver.executeScript("return navigator.userAgent;");
        // console.log("🎯 UA détecté dans Firefox:", ua);
      } catch {}

      // console.log(
      //   `✅ Driver Selenium initialisé (${headless ? "headless" : "graphique"})`
      // );
      return driver;
    } catch (error) {
      console.error("❌ Erreur initialisation driver:", error);
      throw error;
    }
  }

  /**
   * Démarre le navigateur Netflix et navigue vers la page de signup
   * @param {string} sessionId - ID de la session
   * @param {Object} driver - Driver Selenium
   * @returns {Promise<Object>} Résultat avec succès et informations de session
   */
  static async startNetflixBrowser(sessionId, driver) {
    try {
      // console.log("🚀 Démarrage du navigateur Netflix...");

      // console.log("📱 Navigation vers Netflix signup...");
      await driver.get("https://www.netflix.com/signup");
      await driver.sleep(2000);

      const currentUrl = await driver.getCurrentUrl();
      if (!currentUrl.includes("netflix.com")) {
        throw new Error(`URL inattendue: ${currentUrl}`);
      }

      // console.log("🍪 Récupération des cookies initiaux...");
      await cookieService.updateCookies(sessionId);

      // console.log("✅ Navigateur Netflix démarré avec succès!");

      return {
        success: true,
        message: "Session Netflix active - Fenêtre Firefox ouverte",
        url: currentUrl,
      };
    } catch (error) {
      console.error("❌ Erreur lors du démarrage du navigateur:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Ferme le driver et libère les ressources
   * @param {Object} driver - Driver Selenium
   * @returns {Promise<void>}
   */
  static async closeDriver(driver) {
    try {
      if (driver) {
        await driver.quit();
        // console.log("🛑 Driver fermé avec succès");
      }
    } catch (error) {
      console.error("❌ Erreur lors de la fermeture du driver:", error);
      throw error;
    }
  }
}

module.exports = BrowserService;
