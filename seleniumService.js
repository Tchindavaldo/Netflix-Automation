const fs = require("fs");
const { Builder, By, until, Key } = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");

let niveauDeClick = "initialisation";

class SeleniumService {
  constructor() {
    this.driver = null;
    this.initBrowser();
  }

  async initBrowser() {
    try {
      console.log("debut init");

      // Configuration Firefox
      const options = new firefox.Options();

      // AVEC interface graphique (commentez ces lignes pour voir Firefox s'ouvrir)
      // options.addArguments("--headless");

      // Options pour la stabilité
      options.addArguments("--no-sandbox");
      options.addArguments("--disable-dev-shm-usage");
      options.addArguments("--disable-web-security");

      // Construire le driver Firefox
      this.driver = await new Builder()
        .forBrowser("firefox")
        .setFirefoxOptions(options)
        .build();

      // Définir la taille de la fenêtre
      await this.driver.manage().window().setRect({ width: 1366, height: 768 });

      // Définir les timeouts
      await this.driver.manage().setTimeouts({
        implicit: 20000,
        pageLoad: 60000,
        script: 30000,
      });

      console.log("fin init");
    } catch (error) {
      console.error("Erreur lors de l'initialisation du navigateur:", error);
      throw error;
    }
  }

  async fillForm(url, data) {
    console.log("debut ouverture page");

    try {
      // Vérifier si le driver est toujours actif
      if (!this.driver) {
        await this.initBrowser();
      }

      console.log("page chargement en cours");
    } catch (error) {
      console.error("Erreur ouverture de page :", error);

      try {
        await this.driver.takeScreenshot().then((image) => {
          fs.writeFileSync("error_screenshot.png", image, "base64");
        });
        console.log("Screenshot d'erreur sauvegardé.");
      } catch (screenshotError) {
        console.error(
          "Erreur lors de la capture du screenshot :",
          screenshotError
        );
      }

      return { success: false, message: "Impossible d'accéder à la page" };
    }

    try {
      await this.driver.get(url);
      console.log("page charger completment");
    } catch (error) {
      console.error("Erreur 11 lors de la navigation :", error);
      try {
        await this.driver.takeScreenshot().then((image) => {
          fs.writeFileSync("error_screenshot_navigation.png", image, "base64");
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
      const rejectButton = await this.driver.wait(
        until.elementLocated(By.id("onetrust-reject-all-handler")),
        5000
      );
      console.log("Popup de consentement détecté, clic sur 'Reject'...");
      await rejectButton.click();
    } catch (error) {
      console.log("Aucun popup de consentement détecté, on continue...");
    }

    // Clic sur le bouton continuer
    try {
      const continueButton = await this.driver.wait(
        until.elementLocated(By.css('button[data-uia="continue-button"]')),
        10000
      );
      await continueButton.click();
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
      const planElement = await this.driver.wait(
        until.elementLocated(
          By.xpath(`//label[contains(text(), "${planName}")]`)
        ),
        10000
      );
      await planElement.click();
      console.log("clik sur le plan standard with ads");
    } catch (error) {
      console.error("Erreur sélection plan Standard with ads:", error);
    }

    // Sélection du plan Premium
    try {
      const planName3 = "Premium";
      const premiumElement = await this.driver.wait(
        until.elementLocated(
          By.xpath(`//label[contains(text(), "${planName3}")]`)
        ),
        10000
      );
      await premiumElement.click();
      console.log("clik sur le plan premium");
    } catch (error) {
      console.error("Erreur sélection plan Premium:", error);
    }

    // Continuer avec la sélection du plan
    try {
      const planSelectionButton = await this.driver.wait(
        until.elementLocated(By.css('button[data-uia="cta-plan-selection"]')),
        10000
      );
      await planSelectionButton.click();
    } catch (error) {
      console.error("Erreur clic plan selection:", error);
    }

    // Continuer l'enregistrement
    try {
      const continueRegButton = await this.driver.wait(
        until.elementLocated(
          By.css('button[data-uia="cta-continue-registration"]')
        ),
        10000
      );
      await continueRegButton.click();
    } catch (error) {
      console.error("Erreur continue registration:", error);
    }

    // Remplissage email et mot de passe
    try {
      const emailField = await this.driver.wait(
        until.elementLocated(By.css('input[data-uia="field-email"]')),
        10000
      );
      await emailField.clear();
      await emailField.sendKeys(data.email);

      const passwordField = await this.driver.wait(
        until.elementLocated(By.css('input[data-uia="field-password"]')),
        10000
      );
      await passwordField.clear();
      await passwordField.sendKeys(data.password);

      console.log("Email et mot de passe remplis");
    } catch (error) {
      console.error("Erreur remplissage email/password:", error);
      return { success: false, message: "Erreur remplissage email/password" };
    }

    console.log("de but de la recherche de la checkbox");

    // Clic sur le bouton d'enregistrement
    try {
      const registrationButton = await this.driver.wait(
        until.elementLocated(By.css('button[data-uia="cta-registration"]')),
        10000
      );
      await registrationButton.click();
    } catch (error) {
      console.error("Erreur clic registration:", error);
    }

    // Sélection du mode de paiement
    try {
      const paymentModeButton = await this.driver.wait(
        until.elementLocated(By.id("creditOrDebitCardDisplayStringId")),
        10000
      );
      await paymentModeButton.click();
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
      const cardNumberField = await this.driver.wait(
        until.elementLocated(
          By.css('input[data-uia="field-creditCardNumber"]')
        ),
        10000
      );
      await cardNumberField.clear();
      await cardNumberField.sendKeys(data.cardNumber);
      console.log("Numéro de carte rempli :", data.cardNumber);

      // Date d'expiration
      const expirationField = await this.driver.wait(
        until.elementLocated(
          By.css('input[data-uia="field-creditExpirationMonth"]')
        ),
        10000
      );
      await expirationField.clear();
      await expirationField.sendKeys(data.expirationDate);
      console.log("Date d'expiration remplie :", data.expirationDate);

      // CVV
      const cvvField = await this.driver.wait(
        until.elementLocated(
          By.css('input[data-uia="field-creditCardSecurityCode"]')
        ),
        10000
      );
      await cvvField.clear();
      await cvvField.sendKeys(data.cvv);
      console.log("CVV rempli :", data.cvv);

      // Nom sur la carte
      const nameField = await this.driver.wait(
        until.elementLocated(By.css('input[data-uia="field-name"]')),
        10000
      );
      await nameField.clear();
      await nameField.sendKeys(data.nameOnCard);
      console.log("nom remplir :", data.nameOnCard);

      // Code postal
      const codePostal = "75000";
      const zipcodeField = await this.driver.wait(
        until.elementLocated(By.css('input[data-uia="field-creditZipcode"]')),
        10000
      );
      await zipcodeField.clear();
      await zipcodeField.sendKeys(codePostal);
      console.log(`Code postal rempli : ${codePostal}`);
    } catch (error) {
      console.error("Erreur remplissage informations carte:", error);
      return { success: false, message: "Erreur remplissage carte de crédit" };
    }

    // Debug: lister tous les inputs avec data-uia
    try {
      const inputs = await this.driver.findElements(By.css("input"));
      const inputsDataUia = [];

      for (let input of inputs) {
        try {
          const dataUia = await input.getAttribute("data-uia");
          if (dataUia) {
            inputsDataUia.push(dataUia);
          }
        } catch (e) {
          // Ignorer les erreurs d'éléments non accessibles
        }
      }

      console.log("Attributs data-uia des inputs :", inputsDataUia);
    } catch (error) {
      console.log("Erreur debug inputs:", error);
    }

    try {
      console.log("saut du la case a cocher");
    } catch (error) {
      console.error("Erreur lors du clic sur la case à cocher :", error);

      await this.driver.takeScreenshot().then((image) => {
        fs.writeFileSync("error-screenshot.png", image, "base64");
      });
      console.log("📸 Capture d'écran sauvegardée : error-screenshot.png");

      const pageHTML = await this.driver.getPageSource();
      fs.writeFileSync("error-page.html", pageHTML);
      console.log("📄 HTML de la page sauvegardé : error-page.html");

      return { success: false, message: error.message };
    }

    // Clic sur le bouton de soumission du paiement
    try {
      niveauDeClick = "click sur le btn start MemberShip";
      const submitPaymentButton = await this.driver.wait(
        until.elementLocated(
          By.css('button[data-uia="action-submit-payment"]')
        ),
        10000
      );
      await submitPaymentButton.click();

      try {
        // Attendre soit l'erreur soit la navigation
        await this.driver.wait(
          until.elementLocated(By.css('[data-uia="UIMessage-content"]')),
          10000
        );

        await this.driver.takeScreenshot().then((image) => {
          fs.writeFileSync("error-screenshot1.png", image, "base64");
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
        await this.driver.takeScreenshot().then((image) => {
          fs.writeFileSync("screenshost2.png", image, "base64");
        });
        console.log("capture effectuer");
        console.log("erreur détectée", error);
      }
    } catch (error) {
      await this.driver.takeScreenshot().then((image) => {
        fs.writeFileSync("error-screenshot-final.png", image, "base64");
      });
      console.log(
        "📸 Capture d'écran final sauvegardée : error-screenshot.png"
      );

      const objectToReturn = { niveauDeClick: niveauDeClick, erreur: error };
      return objectToReturn;
    }

    // Clic final sur order-final
    try {
      const orderFinalButton = await this.driver.wait(
        until.elementLocated(By.css('button[data-uia="cta-order-final"]')),
        10000
      );
      await orderFinalButton.click();
      niveauDeClick = "click sur le btn order-final";
    } catch (error) {
      const objectToReturn = { niveauDeClick: niveauDeClick, erreur: error };
      return objectToReturn;
    }

    // Finalisation
    niveauDeClick = "fin";
    const result = await this.driver.getTitle();

    const objectToReturn = { val: result, text: "valeur update" };
    return objectToReturn;
  }

  // Méthode pour vérifier la connexion Internet en se rendant sur Google
  async checkConnection() {
    try {
      // Vérifier si le driver est initialisé
      if (!this.driver) {
        await this.initBrowser();
      }

      // Aller sur Google
      await this.driver.get("https://www.google.com");

      // Attendre que le titre contienne 'Google'
      await this.driver.wait(until.titleContains("Google"), 10000);

      return { success: true, message: "Connexion Internet fonctionnelle" };
    } catch (error) {
      console.error("Erreur lors de la vérification de la connexion:", error);
      return { success: false, message: "Connexion Internet échouée", error: error.message };
    }
  }

  async closeBrowser() {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
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

module.exports = { SeleniumService };
