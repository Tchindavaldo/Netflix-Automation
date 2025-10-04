const { NetflixSessionManager } = require("../../../services/netflix/NetflixSessionManager");
const { By, until } = require("selenium-webdriver");

/**
 * Gestionnaire pour sélectionner un plan Netflix
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const selectPlanHandler = async (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.headers["x-session-id"];
    const planSelector = req.body.planSelector || req.query.planSelector;

    // Validation du sessionId
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message:
          "ID de session requis. Démarrez d'abord une session avec /api/netflix/session/start",
      });
    }

    // Validation du sélecteur de plan
    if (!planSelector) {
      return res.status(400).json({
        success: false,
        message: "Le paramètre 'planSelector' est obligatoire",
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

    console.log(`🔍 Recherche du plan avec le sélecteur: ${planSelector}`);

    // URL actuelle avant le clic
    const urlBefore = await driver.getCurrentUrl();

    // Attendre que l'élément du plan soit présent
    const planElement = await driver.wait(
      until.elementLocated(By.css(planSelector)),
      10000
    ).catch(async (error) => {
      console.error(`❌ Plan non trouvé: ${planSelector}`);

      // Capturer l'état actuel pour debug
      const currentUrl = await driver.getCurrentUrl();
      const pageSource = await driver.getPageSource();

      return res.status(404).json({
        success: false,
        message: `Plan non trouvé avec le sélecteur: ${planSelector}`,
        debug: {
          currentUrl,
          selector: planSelector,
          pageSourceLength: pageSource.length
        }
      });
    });

    if (!planElement) {
      return; // La réponse a déjà été envoyée dans le catch
    }

    // Attendre que l'élément soit cliquable
    await driver.wait(until.elementIsEnabled(planElement), 5000).catch(() => {
      console.warn("⚠️ L'élément du plan n'est pas devenu cliquable dans le délai");
    });

    console.log(`🎯 Clic sur le plan...`);

    // Cliquer sur le plan
    await planElement.click();

    // Attendre un peu pour laisser la sélection se faire
    await driver.sleep(1500);

    // URL après le clic
    const urlAfter = await driver.getCurrentUrl();
    const title = await driver.getTitle();

    console.log(`✅ Plan sélectionné - Navigation: ${urlBefore} → ${urlAfter}`);

    res.status(200).json({
      success: true,
      sessionId,
      planSelector,
      navigation: {
        before: urlBefore,
        after: urlAfter,
        changed: urlBefore !== urlAfter,
      },
      title,
      message: "Plan sélectionné avec succès",
    });
  } catch (error) {
    console.error("Erreur dans le gestionnaire selectPlan:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la sélection du plan",
      error: error.toString(),
    });
  }
};

module.exports = selectPlanHandler;
