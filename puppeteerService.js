const fs = require("fs");
const puppeteer = require("puppeteer");

let niveauDeClick = "initialisation";

class PuppeteerService {
  constructor() {
    this.browser = null;
    this.initBrowser();
  }

  async initBrowser() {
    try {
      console.log("debut init");
      this.browser = await puppeteer.launch({
         headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
        ],
      });
      console.log("fin init");
    } catch (error) {
      console.error("Erreur lors de l'initialisation du navigateur:", error);
      throw error;
    }
  }

  async fillForm(url, data) {
    console.log("debut ouverture page");

    let page;

    try {
      // Vérifier si le navigateur est toujours actif
      if (!this.browser || !this.browser.isConnected()) {
        await this.initBrowser();
      }

      console.log("page chargement en cours");
      page = await this.browser.newPage();

      // Configuration de la page
      await page.setDefaultTimeout(20000);
      await page.setViewport({ width: 1366, height: 768 });

      // User agent pour éviter la détection
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );
    } catch (error) {
      console.error("Erreur ouverture de page :", error);

      if (page) {
        try {
          await page.screenshot({
            path: "error_screenshot.png",
            fullPage: true,
          });
          console.log("Screenshot d'erreur sauvegardé.");
        } catch (screenshotError) {
          console.error(
            "Erreur lors de la capture du screenshot :",
            screenshotError
          );
        }
      } else {
        console.log(
          "La page n'a pas été initialisée, pas de screenshot possible."
        );
      }

      return { success: false, message: "Impossible d'accéder à la page" };
    }

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      console.log("page charger completment");
    } catch (error) {
      console.error("Erreur 11 lors de la navigation :", error);
      try {
        await page.screenshot({
          path: "error_screenshot_navigation.png",
          fullPage: true,
        });
        console.log("Screenshot d'erreur sauvegardé après navigation.");
      } catch (screenshotError) {
        console.error(
          "Erreur lors de la capture du screenshot de navigation:",
          screenshotError
        );
      }

      console.error("Erreur lors de la navigation :", error);
      return { success: false, message: "Impossible d'accéder à la page" };
    }

    // Gestion du popup de consentement
    try {
      await page.waitForSelector("#onetrust-reject-all-handler", {
        timeout: 5000,
      });
      console.log("Popup de consentement détecté, clic sur 'Reject'...");
      await page.click("#onetrust-reject-all-handler");
    } catch (error) {
      console.log("Aucun popup de consentement détecté, on continue...");
    }

    // Clic sur le bouton continuer
    try {
      await page.waitForSelector('button[data-uia="continue-button"]', {
        timeout: 10000,
      });
      await page.click('button[data-uia="continue-button"]');
      console.log("execution du click suivant 2");
    } catch (error) {
      console.error(
        "Erreur lors du click sur le 1er btn pour continuer :",
        error
      );
      return { success: false, message: "Impossible d'accéder à la page" };
    }

    // Sélection du plan Standard with ads
    try {
      const planName = "Standard with ads";
      await page.waitForXPath(`//label[contains(text(), "${planName}")]`, {
        timeout: 10000,
      });
      const [planElement] = await page.$x(
        `//label[contains(text(), "${planName}")]`
      );
      if (planElement) {
        await planElement.click();
        console.log("clik sur le plan standard with ads");
      }
    } catch (error) {
      console.error("Erreur sélection plan Standard with ads:", error);
    }

    // Sélection du plan Premium
    try {
      const planName3 = "Premium";
      await page.waitForXPath(`//label[contains(text(), "${planName3}")]`, {
        timeout: 10000,
      });
      const [premiumElement] = await page.$x(
        `//label[contains(text(), "${planName3}")]`
      );
      if (premiumElement) {
        await premiumElement.click();
        console.log("clik sur le plan premium");
      }
    } catch (error) {
      console.error("Erreur sélection plan Premium:", error);
    }

    // Continuer avec la sélection du plan
    try {
      await page.waitForSelector('button[data-uia="cta-plan-selection"]', {
        timeout: 10000,
      });
      await page.click('button[data-uia="cta-plan-selection"]');
    } catch (error) {
      console.error("Erreur clic plan selection:", error);
    }

    // Continuer l'enregistrement
    try {
      await page.waitForSelector(
        'button[data-uia="cta-continue-registration"]',
        { timeout: 10000 }
      );
      await page.click('button[data-uia="cta-continue-registration"]');
    } catch (error) {
      console.error("Erreur continue registration:", error);
    }

    // Remplissage email et mot de passe
    try {
      await page.waitForSelector('input[data-uia="field-email"]', {
        timeout: 10000,
      });
      await page.type('input[data-uia="field-email"]', data.email);

      await page.waitForSelector('input[data-uia="field-password"]', {
        timeout: 10000,
      });
      await page.type('input[data-uia="field-password"]', data.password);

      console.log("Email et mot de passe remplis");
    } catch (error) {
      console.error("Erreur remplissage email/password:", error);
      return { success: false, message: "Erreur remplissage email/password" };
    }

    console.log("de but de la recherche de la checkbox");

    // Clic sur le bouton d'enregistrement
    try {
      await page.waitForSelector('button[data-uia="cta-registration"]', {
        timeout: 10000,
      });
      await page.click('button[data-uia="cta-registration"]');
    } catch (error) {
      console.error("Erreur clic registration:", error);
    }

    // Sélection du mode de paiement
    try {
      await page.waitForSelector("#creditOrDebitCardDisplayStringId", {
        timeout: 10000,
      });
      await page.click("#creditOrDebitCardDisplayStringId");
      console.log("Clic forcé sur la case effectué avec succès.");
    } catch (error) {
      console.error("Erreur sélection mode paiement:", error);
    }

    // Remplissage des informations de carte de crédit
    console.log(
      "Début du remplissage des champs du formulaire de carte de crédit..."
    );

    try {
      // Numéro de carte
      await page.waitForSelector('input[data-uia="field-creditCardNumber"]', {
        timeout: 10000,
      });
      await page.type(
        'input[data-uia="field-creditCardNumber"]',
        data.cardNumber
      );
      console.log("Numéro de carte rempli :", data.cardNumber);

      // Date d'expiration
      await page.waitForSelector(
        'input[data-uia="field-creditExpirationMonth"]',
        { timeout: 10000 }
      );
      await page.type(
        'input[data-uia="field-creditExpirationMonth"]',
        data.expirationDate
      );
      console.log("Date d'expiration remplie :", data.expirationDate);

      // CVV
      await page.waitForSelector(
        'input[data-uia="field-creditCardSecurityCode"]',
        { timeout: 10000 }
      );
      await page.type(
        'input[data-uia="field-creditCardSecurityCode"]',
        data.cvv
      );
      console.log("CVV rempli :", data.cvv);

      // Nom sur la carte
      await page.waitForSelector('input[data-uia="field-name"]', {
        timeout: 10000,
      });
      await page.type('input[data-uia="field-name"]', data.nameOnCard);
      console.log("nom remplir :", data.nameOnCard);

      // Code postal
      const codePostal = "75000";
      await page.waitForSelector('input[data-uia="field-creditZipcode"]', {
        timeout: 10000,
      });
      await page.type('input[data-uia="field-creditZipcode"]', codePostal);
      console.log(`Code postal rempli : ${codePostal}`);
    } catch (error) {
      console.error("Erreur remplissage informations carte:", error);
      return { success: false, message: "Erreur remplissage carte de crédit" };
    }

    // Debug: lister tous les inputs avec data-uia
    try {
      const inputsDataUia = await page.evaluate(() => {
        const inputs = document.querySelectorAll("input");
        return Array.from(inputs)
          .map((input) => input.getAttribute("data-uia"))
          .filter(Boolean);
      });
      console.log("Attributs data-uia des inputs :", inputsDataUia);
    } catch (error) {
      console.log("Erreur debug inputs:", error);
    }

    try {
      console.log("saut du la case a cocher");
    } catch (error) {
      console.error("Erreur lors du clic sur la case à cocher :", error);

      await page.screenshot({ path: "error-screenshot.png", fullPage: true });
      console.log("📸 Capture d'écran sauvegardée : error-screenshot.png");

      const pageHTML = await page.content();
      fs.writeFileSync("error-page.html", pageHTML);
      console.log("📄 HTML de la page sauvegardé : error-page.html");

      return { success: false, message: error.message };
    }

    // Clic sur le bouton de soumission du paiement
    try {
      niveauDeClick = "click sur le btn start MemberShip";
      await page.waitForSelector('button[data-uia="action-submit-payment"]', {
        timeout: 10000,
      });
      await page.click('button[data-uia="action-submit-payment"]');

      try {
        // Attendre soit l'erreur soit la navigation
        await page.waitForSelector('[data-uia="UIMessage-content"]', {
          timeout: 10000,
        });

        await page.screenshot({
          path: "error-screenshot1.png",
          fullPage: true,
        });
        console.log(
          "📸 Capture d'écran 1111 sauvegardée : error-screenshot.png"
        );

        return {
          success: false,
          error: "Erreur de paiement détectée",
          niveauDeClick: "après action-submit-payment",
          details: "Erreur de paiement détectée",
        };
      } catch (error) {
        await page.screenshot({ path: "screenshost2.png", fullPage: true });
        console.log("capture effectuer");
        console.log("erreur détectée", error);
      }
    } catch (error) {
      await page.screenshot({
        path: "error-screenshot-final.png",
        fullPage: true,
      });
      console.log(
        "📸 Capture d'écran final sauvegardée : error-screenshot.png"
      );

      const objectToReturn = { niveauDeClick: niveauDeClick, erreur: error };
      return objectToReturn;
    }

    // Clic final sur order-final
    try {
      await page.waitForSelector('button[data-uia="cta-order-final"]', {
        timeout: 10000,
      });
      await page.click('button[data-uia="cta-order-final"]');
      niveauDeClick = "click sur le btn order-final";
    } catch (error) {
      const objectToReturn = { niveauDeClick: niveauDeClick, erreur: error };
      return objectToReturn;
    }

    // Finalisation
    niveauDeClick = "fin";
    const result = await page.title();

    // Fermer la page mais pas le navigateur
    await page.close();

    const objectToReturn = { val: result, text: "valeur update" };
    return objectToReturn;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Méthode pour nettoyer les ressources
  async cleanup() {
    await this.closeBrowser();
  }
}

// Gestion propre de l'arrêt du processus
process.on("SIGINT", async () => {
  console.log("Received SIGINT, cleaning up...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, cleaning up...");
  process.exit(0);
});

module.exports = { PuppeteerService };
