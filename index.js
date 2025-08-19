// Charge les variables d'environnement en fonction de NODE_ENV
if (process.env.NODE_ENV === "production") {
  require("dotenv").config({ path: ".env.prod" }); // Pour la production
} else {
  require("dotenv").config({ path: ".env.dev" }); // Pour le développement
}
const { SeleniumService } = require("./seleniumService");
const seleniumService = new SeleniumService();

const { NetflixCookieService } = require("./netflix-cookie-service");
const netflixCookieService = new NetflixCookieService();

const express = require("express");
const cors = require("cors"); // Assurez-vous d'importer le package cors
// const { PlaywrightService } = require("./playwrightService");

const { PuppeteerService } = require("./puppeteerService");
const puppeteerService = new PuppeteerService();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
// const playwrightService = new PlaywrightService();

// Utiliser express.json() pour parser les requêtes avec body en JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Pour parser les données URL-encoded

// Configurer CORS pour permettre toutes les origines
app.use(
  cors({
    origin: "*", // '*' autorise toutes les origines. Si tu veux autoriser juste certaines origines, remplace par l'URL spécifique.
    methods: ["GET", "POST", "PUT", "DELETE"], // Méthodes autorisées
    allowedHeaders: ["Content-Type"], // En-têtes autorisés
  })
);

app.get("/health", (req, res) => {
  console.log("status verifier ok avec success");
  res.status(200).send("OK");
});

// Endpoint: Autofill & submit payment form (creditoption) in the browser
app.post("/api/netflix/payment/autofill-submit", async (req, res) => {
  try {
    const sessionStatus = netflixCookieService.getSessionStatus();
    if (!sessionStatus.active) {
      return res.status(400).json({
        success: false,
        message: "Aucune session Netflix active. Démarrez d'abord une session avec /api/netflix/session/start",
      });
    }

    const details = req.body || {};
    console.log('🧾 Autofill paiement (creditoption) avec details:', {
      hasCardNumber: !!details.cardNumber,
      expMonth: details.expMonth,
      expYear: details.expYear,
      hasCVV: !!details.cvv,
      firstName: details.firstName,
      lastName: details.lastName,
      agree: details.agree,
      email: details.email
    });

    const result = await netflixCookieService.autoFillAndSubmitCreditOption(details);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('❌ Erreur autofill paiement:', error);
    res.status(500).json({ 
      success: false, 
      message: (error && error.message) ? error.message : 'Autofill paiement: erreur inconnue', 
      error: error ? error.toString() : 'No error object',
      stack: error && error.stack ? error.stack : undefined
    });
  }
});

// Endpoint Netflix API - Étape paiement creditoption depuis le navigateur
app.post("/api/netflix/path-evaluator-browser-creditoption", async (req, res) => {
  try {
    const sessionStatus = netflixCookieService.getSessionStatus();
    if (!sessionStatus.active) {
      return res.status(400).json({
        success: false,
        message: "Aucune session Netflix active. Démarrez d'abord une session avec /api/netflix/session/start",
      });
    }

    console.log('🌐 Appel API Netflix (creditoption) depuis le navigateur Firefox...');

    const customParams = req.body.params || {};
    const headerOverrides = req.body.headers || {};
    const result = await netflixCookieService.callNetflixAPICreditOption(customParams, headerOverrides);

    res.status(result.success ? 200 : (result.status || 500)).json({
      ...result,
      message: result.success ?
        'Appel API Netflix creditoption réussi depuis le navigateur' :
        result.message || 'Erreur lors de l\'appel API Netflix creditoption'
    });
  } catch (error) {
    console.error('❌ Erreur endpoint browser API (creditoption):', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de l'appel API Netflix creditoption depuis le navigateur",
      error: error.toString(),
    });
  }
});

// Endpoint Netflix API - Étape regform (registration) depuis le navigateur
app.post("/api/netflix/path-evaluator-browser-regform", async (req, res) => {
  try {
    const sessionStatus = netflixCookieService.getSessionStatus();
    if (!sessionStatus.active) {
      return res.status(400).json({
        success: false,
        message: "Aucune session Netflix active. Démarrez d'abord une session avec /api/netflix/session/start",
      });
    }

    console.log('🌐 Appel API Netflix (regform) depuis le navigateur Firefox...');

    const customParams = req.body.params || {};
    const result = await netflixCookieService.callNetflixAPIRegistration(customParams);

    res.status(result.success ? 200 : (result.status || 500)).json({
      ...result,
      message: result.success ?
        'Appel API Netflix regform réussi depuis le navigateur' :
        result.message || 'Erreur lors de l\'appel API Netflix regform'
    });
  } catch (error) {
    console.error('❌ Erreur endpoint browser API (regform):', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de l'appel API Netflix regform depuis le navigateur",
      error: error.toString(),
    });
  }
});

// Route pour vérifier la connexion Internet en visitant Google
app.get("/api/check-connection", async (req, res) => {
  try {
    const result = await seleniumService.checkConnection();

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.status(200).json({ success: true, result });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "An error occurred" });
  }
});

// Route pour le formulaire
app.post("/api/fill-form", async (req, res) => {
  const { url, data } = req.body;
  try {
    // Appel à la méthode fillForm dans le service Playwright
    // const result = await playwrightService.fillForm( url, data );
    const result = await seleniumService.fillForm(url, data); // puppeteerService au lieu de playwrightService

    res.status(200).json({ success: true, result }); // Réponse de succès avec le résultat
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "An error occurred" });
  }
});

// Endpoint Netflix API - Replication du call pathEvaluator
app.post("/api/netflix/path-evaluator", async (req, res) => {
  try {
    // URL de l'API Netflix
    const netflixUrl =
      "https://www.netflix.com/api/aui/pathEvaluator/web/%5E2.0.0";

    // Paramètres de query par défaut (peuvent être surchargés par le body de la requête)
    const defaultParams = new URLSearchParams({
      landingURL: "/signup/planform",
      landingOrigin: "https://www.netflix.com",
      inapp: "false",
      isConsumptionOnly: "false",
      logConsumptionOnly: "false",
      languages: "en-US",
      netflixClientPlatform: "browser",
      method: "call",
      callPath: '["aui","moneyball","next"]',
      falcor_server: "0.1.0",
    });

    // Données du formulaire par défaut (peuvent être surchargées par le body de la requête)
    const defaultFormData = new URLSearchParams({
      allocations: "{}",
      tracingId: "v7287ca98",
      tracingGroupId: "www.netflix.com",
      authURL:
        req.body.authURL ||
        "c1.1755167206419.AgiMlOvcAxIgiwRrZHLkx4IzxQFQw5QHkv1uZ2QSEeNcdx7aStj1uf4YAg==",
      param:
        req.body.param ||
        '{"flow":"signupSimplicity","mode":"planSelection","action":"planSelectionAction","fields":{"planChoice":{"value":"4120"},"previousMode":"planSelectionWithContext"}}',
    });

    // Merge avec les paramètres fournis dans la requête
    if (req.body.queryParams) {
      Object.entries(req.body.queryParams).forEach(([key, value]) => {
        defaultParams.set(key, value);
      });
    }

    if (req.body.formData) {
      Object.entries(req.body.formData).forEach(([key, value]) => {
        defaultFormData.set(key, value);
      });
    }

    // Construction de l'URL complète
    const fullUrl = `${netflixUrl}?${defaultParams.toString()}`;

    // Headers Netflix requis
    const headers = {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.5",
      Connection: "keep-alive",
      "Content-Type": "application/x-www-form-urlencoded",
      DNT: "1",
      Host: "www.netflix.com",
      Origin: "https://www.netflix.com",
      Priority: "u=0",
      Referer: "https://www.netflix.com/signup/planform",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "Sec-GPC": "1",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
      "X-Netflix.browserName": "Firefox",
      "X-Netflix.browserVersion": "128",
      "x-netflix.client.request.name": "ui/xhrUnclassified",
      "X-Netflix.clientType": "akira",
      "X-Netflix.esnPrefix": "NFCDFF-LX-",
      "x-netflix.nq.stack": "prod",
      "X-Netflix.osFullName": "Linux",
      "X-Netflix.osName": "Linux",
      "X-Netflix.osVersion": "0.0.0",
      "x-netflix.request.attempt": "1",
      "x-netflix.request.client.context": '{"appstate":"foreground"}',
      "x-netflix.request.id":
        req.body.requestId || "eeeb0141c9054f75b3407dd8cd949cc5",
      "x-netflix.request.routing":
        '{"path":"/nq/aui/endpoint/%5E1.0.0-web/pathEvaluator","control_tag":"auinqweb"}',
      "X-Netflix.uiVersion": "v7287ca98",
    };

    // Ajouter les cookies si fournis
    if (req.body.cookies || req.headers.cookie) {
      headers["Cookie"] = req.body.cookies || req.headers.cookie;
    }

    // Merge avec les headers personnalisés fournis dans la requête
    if (req.body.customHeaders) {
      Object.assign(headers, req.body.customHeaders);
    }

    console.log("Making Netflix API call to:", fullUrl);
    console.log("Form data:", defaultFormData.toString());

    // Faire la requête vers Netflix
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: headers,
      body: defaultFormData.toString(),
      compress: true, // Équivalent de --compressed
    });

    const responseText = await response.text();

    // Tenter de parser en JSON, sinon retourner le texte brut
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    res.status(response.status).json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
    });
  } catch (error) {
    console.error("Netflix API call error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred while calling Netflix API",
      error: error.toString(),
    });
  }
});

// ==================== ENDPOINTS NETFLIX COOKIE SERVICE ====================

// Initialiser la session Netflix et commencer la surveillance des cookies
app.post("/api/netflix/session/start", async (req, res) => {
  // Timeout de 60 secondes pour l'initialisation
  const timeout = setTimeout(() => {
    res.status(408).json({
      success: false,
      message:
        "Timeout: L'initialisation de la session a pris trop de temps (60s)",
    });
  }, 600000);

  try {
    console.log("🚀 Démarrage session Netflix...");
    const result = await netflixCookieService.initializeSession();

    clearTimeout(timeout);

    if (result.success) {
      console.log("✅ Session Netflix démarrée avec succès");
    } else {
      console.log("❌ Échec du démarrage de la session");
    }

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    clearTimeout(timeout);
    console.error("❌ Erreur lors du démarrage:", error.message);

    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors du démarrage de la session",
      error: error.toString(),
    });
  }
});

// Récupérer les cookies actuels
app.get("/api/netflix/cookies", async (req, res) => {
  try {
    const result = netflixCookieService.getCurrentCookies();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération des cookies",
    });
  }
});

// Forcer la mise à jour des cookies
app.post("/api/netflix/cookies/refresh", async (req, res) => {
  try {
    const cookies = await netflixCookieService.updateCookies();
    res.status(200).json({
      success: true,
      message: "Cookies mis à jour",
      cookies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la mise à jour des cookies",
    });
  }
});

// Naviguer vers une page Netflix spécifique
app.post("/api/netflix/navigate", async (req, res) => {
  try {
    const { path } = req.body;
    const result = await netflixCookieService.navigateToPage(path || "/signup");
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la navigation",
    });
  }
});

// Obtenir le statut de la session
app.get("/api/netflix/session/status", (req, res) => {
  try {
    const status = netflixCookieService.getSessionStatus();
    res.status(200).json({
      success: true,
      status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération du statut",
    });
  }
});

// Redémarrer la session
app.post("/api/netflix/session/restart", async (req, res) => {
  try {
    console.log("🔄 Redémarrage session Netflix...");
    const result = await netflixCookieService.restartSession();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors du redémarrage de la session",
    });
  }
});

// Fermer la session
app.post("/api/netflix/session/stop", async (req, res) => {
  try {
    console.log("🛑 Arrêt session Netflix...");
    const result = await netflixCookieService.closeSession();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de l'arrêt de la session",
    });
  }
});

// Endpoint amélioré qui utilise automatiquement les cookies de la session active
app.post("/api/netflix/path-evaluator-auto", async (req, res) => {
  try {
    // Récupérer les cookies de la session active
    const cookieData = netflixCookieService.getCurrentCookies();

    if (!cookieData.success || !cookieData.cookies.cookieString) {
      return res.status(400).json({
        success: false,
        message:
          "Aucune session Netflix active. Démarrez d'abord une session avec /api/netflix/session/start",
      });
    }

    // Utiliser les cookies de la session active
    const requestBody = {
      ...req.body,
      cookies: cookieData.cookies.cookieString,
    };

    // URL de l'API Netflix
    const netflixUrl =
      "https://www.netflix.com/api/aui/pathEvaluator/web/%5E2.0.0";

    // Paramètres de query par défaut
    const defaultParams = new URLSearchParams({
      landingURL: "/signup/planform",
      landingOrigin: "https://www.netflix.com",
      inapp: "false",
      isConsumptionOnly: "false",
      logConsumptionOnly: "false",
      languages: "en-US",
      netflixClientPlatform: "browser",
      method: "call",
      callPath: '["aui","moneyball","next"]',
      falcor_server: "0.1.0",
    });

    // Données du formulaire par défaut
    const defaultFormData = new URLSearchParams({
      allocations: "{}",
      tracingId: "v7287ca98",
      tracingGroupId: "www.netflix.com",
      authURL:
        requestBody.authURL ||
        "c1.1755167206419.AgiMlOvcAxIgiwRrZHLkx4IzxQFQw5QHkv1uZ2QSEeNcdx7aStj1uf4YAg==",
      param:
        requestBody.param ||
        '{"flow":"signupSimplicity","mode":"planSelection","action":"planSelectionAction","fields":{"planChoice":{"value":"4120"},"previousMode":"planSelectionWithContext"}}',
    });

    // Merge avec les paramètres fournis
    if (requestBody.queryParams) {
      Object.entries(requestBody.queryParams).forEach(([key, value]) => {
        defaultParams.set(key, value);
      });
    }

    if (requestBody.formData) {
      Object.entries(requestBody.formData).forEach(([key, value]) => {
        defaultFormData.set(key, value);
      });
    }

    const fullUrl = `${netflixUrl}?${defaultParams.toString()}`;

    // Headers Netflix requis
    const headers = {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.5",
      Connection: "keep-alive",
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: requestBody.cookies,
      DNT: "1",
      Host: "www.netflix.com",
      Origin: "https://www.netflix.com",
      Priority: "u=0",
      Referer: "https://www.netflix.com/signup/planform",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "Sec-GPC": "1",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
      "X-Netflix.browserName": "Firefox",
      "X-Netflix.browserVersion": "128",
      "x-netflix.client.request.name": "ui/xhrUnclassified",
      "X-Netflix.clientType": "akira",
      "X-Netflix.esnPrefix": "NFCDFF-LX-",
      "x-netflix.nq.stack": "prod",
      "X-Netflix.osFullName": "Linux",
      "X-Netflix.osName": "Linux",
      "X-Netflix.osVersion": "0.0.0",
      "x-netflix.request.attempt": "1",
      "x-netflix.request.client.context": '{"appstate":"foreground"}',
      "x-netflix.request.id":
        requestBody.requestId || "eeeb0141c9054f75b3407dd8cd949cc5",
      "x-netflix.request.routing":
        '{"path":"/nq/aui/endpoint/%5E1.0.0-web/pathEvaluator","control_tag":"auinqweb"}',
      "X-Netflix.uiVersion": "v7287ca98",
    };

    // Merge avec les headers personnalisés
    if (requestBody.customHeaders) {
      Object.assign(headers, requestBody.customHeaders);
    }

    console.log("🚀 Appel Netflix API avec cookies de session active");

    // Faire la requête vers Netflix
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: headers,
      body: defaultFormData.toString(),
      compress: true,
    });

    const responseText = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    res.status(response.status).json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      usedCookies: cookieData.cookies.individual,
    });
  } catch (error) {
    console.error("Netflix API call error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred while calling Netflix API",
      error: error.toString(),
    });
  }
});

// Endpoint Netflix API - Appel direct depuis le navigateur (contourne les problèmes d'authentification)
app.post("/api/netflix/path-evaluator-browser", async (req, res) => {
  try {
    // Vérifier que la session est active
    const sessionStatus = netflixCookieService.getSessionStatus();
    
    if (!sessionStatus.active) {
      return res.status(400).json({
        success: false,
        message: "Aucune session Netflix active. Démarrez d'abord une session avec /api/netflix/session/start"
      });
    }

    console.log('🌐 Appel API Netflix depuis le navigateur Firefox...');
    
    // Paramètres personnalisés depuis la requête
    const customParams = req.body.params || {};
    
    // Faire l'appel API depuis le navigateur
    const result = await netflixCookieService.callNetflixAPI(customParams);
    
    res.status(result.success ? 200 : (result.status || 500)).json({
      ...result,
      message: result.success ? 
        'Appel API Netflix réussi depuis le navigateur' : 
        result.message || 'Erreur lors de l\'appel API Netflix'
    });

  } catch (error) {
    console.error('❌ Erreur endpoint browser API:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de l'appel API Netflix depuis le navigateur",
      error: error.toString()
    });
  }
});

// Lancer le serveur sur le port 3000
app.listen(PORT, () => {
  console.log("Server is running on port ", PORT);
});
