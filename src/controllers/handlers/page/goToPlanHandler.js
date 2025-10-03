const { NetflixSessionManager } = require("../../../services/netflix/NetflixSessionManager");
const { By, until } = require("selenium-webdriver");

/**
 * Gestionnaire pour cliquer sur un bouton et naviguer vers la page de plan
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const goToPlanHandler = async (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.headers["x-session-id"];
    const buttonSelector = req.body.buttonSelector || req.query.buttonSelector;

    // Validation du sessionId
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message:
          "ID de session requis. Démarrez d'abord une session avec /api/netflix/session/start",
      });
    }

    // Validation du sélecteur de bouton
    if (!buttonSelector) {
      return res.status(400).json({
        success: false,
        message: "Le paramètre 'buttonSelector' est obligatoire",
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

    console.log(`🔍 Recherche du bouton avec le sélecteur: ${buttonSelector}`);

    // URL actuelle avant le clic
    const urlBefore = await driver.getCurrentUrl();

    // Attendre que le bouton soit présent
    const button = await driver.wait(
      until.elementLocated(By.css(buttonSelector)),
      10000
    ).catch(async (error) => {
      console.error(`❌ Bouton non trouvé: ${buttonSelector}`);

      // Capturer l'état actuel pour debug
      const currentUrl = await driver.getCurrentUrl();
      const pageSource = await driver.getPageSource();

      return res.status(404).json({
        success: false,
        message: `Bouton non trouvé avec le sélecteur: ${buttonSelector}`,
        debug: {
          currentUrl,
          selector: buttonSelector,
          pageSourceLength: pageSource.length
        }
      });
    });

    if (!button) {
      return; // La réponse a déjà été envoyée dans le catch
    }

    // Attendre que le bouton soit cliquable
    await driver.wait(until.elementIsEnabled(button), 5000).catch(() => {
      console.warn("⚠️ Le bouton n'est pas devenu cliquable dans le délai");
    });

    console.log(`🎯 Clic sur le bouton...`);

    // Cliquer sur le bouton
    await button.click();

    // Attendre un peu pour laisser la navigation se déclencher
    await driver.sleep(2000);

    // URL après le clic
    const urlAfter = await driver.getCurrentUrl();
    const title = await driver.getTitle();

    console.log(`✅ Clic effectué - Navigation: ${urlBefore} → ${urlAfter}`);

    res.status(200).json({
      success: true,
      sessionId,
      buttonSelector,
      navigation: {
        before: urlBefore,
        after: urlAfter,
        changed: urlBefore !== urlAfter,
      },
      title,
      message: "Clic effectué avec succès",
    });
  } catch (error) {
    console.error("Erreur dans le gestionnaire goToPlan:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors du clic sur le bouton",
      error: error.toString(),
    });
  }
};

module.exports = goToPlanHandler;
