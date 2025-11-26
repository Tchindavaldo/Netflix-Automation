const {
  NetflixSessionManager,
} = require("../../../services/netflix/NetflixSessionManager");
const { By, until } = require("selenium-webdriver");

/**
 * Gestionnaire pour sélectionner une méthode de paiement sur Netflix
 * L'utilisateur spécifie le sélecteur à utiliser
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const selectPaymentMethodHandler = async (req, res) => {
  try {
    const sessionId =
      req.body.sessionId || req.query.sessionId || req.headers["x-session-id"];
    const selector = req.body.selector || req.query.selector;

    // Log pour déboguer
    // console.log("📥 Paramètres reçus:", {
    //   sessionId,
    //   selector,
    //   body: req.body,
    //   query: req.query,
    // });

    // Validation du sessionId
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message:
          "ID de session requis. Démarrez d'abord une session avec /api/netflix/session/start",
      });
    }

    // Validation du sélecteur
    if (!selector) {
      return res.status(400).json({
        success: false,
        message: "Le paramètre 'selector' est obligatoire",
        examples: {
          option1: {
            selector: "#creditOrDebitCardDisplayStringId",
            description: "Par ID (le plus fiable)",
          },
          option2: {
            selector: 'button[data-uia="payment-choice+creditOrDebitOption"]',
            description: "Par data-uia (recommandé par Netflix)",
          },
          option3: {
            selector: "button.paymentTab",
            description: "Par classe (moins spécifique)",
          },
        },
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

    // console.log(`💳 Recherche du bouton de paiement avec: ${selector}`);

    // URL actuelle avant le clic
    const urlBefore = await driver.getCurrentUrl();
    // console.log(`📍 URL actuelle: ${urlBefore}`);

    let button;
    try {
      // console.log(`🔍 Recherche de l'élément...`);

      // Attendre que l'élément soit présent
      button = await driver.wait(until.elementLocated(By.css(selector)), 10000);

      // console.log(`✅ Élément trouvé`);

      // Attendre que le bouton soit visible et cliquable
      await driver.wait(until.elementIsVisible(button), 5000);
      await driver.wait(until.elementIsEnabled(button), 5000);

      // console.log(`✅ Bouton prêt pour le clic`);
    } catch (error) {
      console.error(`❌ Bouton non trouvé avec le sélecteur: ${selector}`);

      // Capturer l'état actuel pour debug
      const currentUrl = await driver.getCurrentUrl();
      const pageSource = await driver.getPageSource();

      return res.status(404).json({
        success: false,
        message: `Bouton non trouvé avec le sélecteur: ${selector}`,
        debug: {
          currentUrl,
          selector,
          pageSourceLength: pageSource.length,
        },
        error: error.message,
      });
    }

    // console.log(`🎯 Clic sur le bouton de paiement...`);

    // Cliquer sur le bouton
    await button.click();

    // console.log(`✅ Clic effectué avec succès`);

    // Attendre que la navigation se produise
    await driver.sleep(2000);

    // URL après le clic
    const urlAfter = await driver.getCurrentUrl();
    const title = await driver.getTitle();

    // console.log(`📍 Navigation: ${urlBefore} → ${urlAfter}`);

    res.status(200).json({
      success: true,
      sessionId,
      selector,
      navigation: {
        before: urlBefore,
        after: urlAfter,
        changed: urlBefore !== urlAfter,
      },
      page: {
        url: urlAfter,
        title,
      },
      message: "Méthode de paiement sélectionnée avec succès",
    });
  } catch (error) {
    console.error("Erreur dans le gestionnaire selectPaymentMethod:", error);
    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Erreur lors de la sélection de la méthode de paiement",
      error: error.toString(),
    });
  }
};

module.exports = selectPaymentMethodHandler;
