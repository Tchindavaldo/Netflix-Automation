const {
  NetflixSessionManager,
} = require("../../../services/netflix/NetflixSessionManager");
const { By, until } = require("selenium-webdriver");

/**
 * Gestionnaire pour remplir un formulaire avec des valeurs dynamiques
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const fillFormHandler = async (req, res) => {
  try {
    const sessionId =
      req.body.sessionId || req.query.sessionId || req.headers["x-session-id"];
    const fields = req.body.fields; // Array d'objets { selector, value, type }

    // Log pour déboguer
    // console.log("📥 Paramètres reçus:", {
    //   sessionId,
    //   fieldsCount: fields ? fields.length : 0,
    //   fields,
    // });

    // Validation du sessionId
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message:
          "ID de session requis. Démarrez d'abord une session avec /api/netflix/session/start",
      });
    }

    // Validation des champs
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Le paramètre 'fields' est obligatoire et doit être un tableau d'objets avec { selector, value, type }",
        example: {
          fields: [
            {
              selector: 'input[data-uia="field-email"]',
              value: "test@example.com",
              type: "input",
            },
            {
              selector: 'input[data-uia="field-password"]',
              value: "password123",
              type: "input",
            },
          ],
        },
      });
    }

    // Validation de chaque champ
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (!field.selector) {
        return res.status(400).json({
          success: false,
          message: `Le champ à l'index ${i} doit avoir un 'selector'`,
          field,
        });
      }
      if (field.value === undefined || field.value === null) {
        return res.status(400).json({
          success: false,
          message: `Le champ à l'index ${i} doit avoir une 'value'`,
          field,
        });
      }
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
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // console.log(`📝 Début du remplissage de ${fields.length} champ(s)...`);

    // URL actuelle
    const currentUrl = await driver.getCurrentUrl();
    // console.log(`📍 URL actuelle: ${currentUrl}`);

    // Parcourir tous les champs
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const fieldType = field.type || "input"; // Par défaut: input

      try {
        // console.log(
        //   `\n🔍 [${i + 1}/${fields.length}] Recherche du champ: ${field.selector}`,
        // );

        // Attendre que l'élément soit présent
        const element = await driver.wait(
          until.elementLocated(By.css(field.selector)),
          10000,
        );

        // console.log(`✓ Élément trouvé: ${field.selector}`);

        // Attendre que l'élément soit visible et interactable
        await driver.wait(until.elementIsVisible(element), 5000);
        await driver.wait(until.elementIsEnabled(element), 5000);

        // console.log(`✓ Élément prêt pour interaction`);

        // Action selon le type
        if (fieldType === "checkbox" || fieldType === "radio") {
          // Pour les checkbox et radio
          const isSelected = await element.isSelected();
          const shouldBeSelected =
            field.value === true ||
            field.value === "true" ||
            field.value === "1" ||
            field.value === 1;

          if (isSelected !== shouldBeSelected) {
            await element.click();
            // console.log(
            //   `✓ Checkbox/Radio ${shouldBeSelected ? "coché" : "décoché"}`,
            // );
          } else {
            // console.log(
            //   `ℹ️ Checkbox/Radio déjà dans l'état souhaité: ${shouldBeSelected}`,
            // );
          }
        } else {
          // Pour les inputs texte, email, password, etc.
          // Effacer le contenu existant
          await element.clear();
          // console.log(`✓ Contenu effacé`);

          // Entrer la nouvelle valeur
          await element.sendKeys(String(field.value));
          // console.log(`✓ Valeur entrée: ${field.value}`);

          // Vérifier que la valeur a bien été entrée
          const enteredValue = await element.getAttribute("value");
          if (enteredValue !== String(field.value)) {
            // console.warn(
            //   `⚠️ La valeur entrée ne correspond pas: attendu="${field.value}", obtenu="${enteredValue}"`,
            // );
          }
        }

        successCount++;
        results.push({
          index: i,
          selector: field.selector,
          type: fieldType,
          success: true,
          message: "Champ rempli avec succès",
        });

        // console.log(`✅ [${i + 1}/${fields.length}] Champ rempli avec succès`);
      } catch (error) {
        errorCount++;
        // console.error(
        //   `❌ [${i + 1}/${fields.length}] Erreur pour le champ ${field.selector}:`,
        //   error.message,
        // );

        results.push({
          index: i,
          selector: field.selector,
          type: fieldType,
          success: false,
          message: error.message,
          error: error.toString(),
        });
      }
    }

    // console.log(
    //   `\n📊 Résumé: ${successCount} réussi(s), ${errorCount} échec(s)`,
    // );

    // Attendre un peu pour que les changements soient bien pris en compte
    await driver.sleep(500);

    const finalUrl = await driver.getCurrentUrl();
    const title = await driver.getTitle();

    // Déterminer le statut de la réponse
    const statusCode =
      errorCount === 0 ? 200 : errorCount === fields.length ? 500 : 207; // 207 = Multi-Status

    res.status(statusCode).json({
      success: errorCount === 0,
      sessionId,
      summary: {
        total: fields.length,
        success: successCount,
        errors: errorCount,
      },
      results,
      page: {
        url: finalUrl,
        title,
        urlChanged: currentUrl !== finalUrl,
      },
      message:
        errorCount === 0
          ? "Tous les champs ont été remplis avec succès"
          : errorCount === fields.length
            ? "Aucun champ n'a pu être rempli"
            : `${successCount} champ(s) rempli(s), ${errorCount} échec(s)`,
    });
  } catch (error) {
    // console.error("Erreur dans le gestionnaire fillForm:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors du remplissage du formulaire",
      error: error.toString(),
    });
  }
};

module.exports = fillFormHandler;
