// Service automatisé pour maintenir une session Netflix et récupérer les cookies
const { Builder } = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");
const fs = require('fs');
const path = require('path');

class NetflixCookieService {
  constructor() {
    this.driver = null;
    this.isSessionActive = false;
    this.cookies = {};
    this.sessionCheckInterval = null;
    this.cookieUpdateInterval = null;
  }

  /**
   * Remplit automatiquement le formulaire de carte (VISA), coche l'accord et soumet
   * details: { cardNumber, expMonth, expYear, cvv, firstName, lastName, agree }
   */
  async autoFillAndSubmitCreditOption(details) {
    const { By, until } = require('selenium-webdriver');

    // Validation basique et extraction des valeurs
    const { cardNumber, expMonth, expYear, cvv, firstName = '', lastName = '', agree = true, email = '' } = details || {};
    if (!this.driver) throw new Error('Session non initialisée');
    if (!cardNumber || !expMonth || !expYear || !cvv) {
      throw new Error('Champs requis manquants: cardNumber, expMonth, expYear, cvv');
    }

    // Helpers
    const switchToFrameContaining = async (selectors) => {
      const frames = await this.driver.findElements(By.css('iframe'));
      for (let i = 0; i < frames.length; i++) {
        try {
          await this.driver.switchTo().defaultContent();
          await this.driver.switchTo().frame(frames[i]);
          for (const sel of selectors) {
            const els = await this.driver.findElements(By.css(sel));
            if (els && els.length) {
              return { frameIndex: i, selector: sel };
            }
          }
        } catch {}
      }
      await this.driver.switchTo().defaultContent();
      return null;
    };

    const findFirst = async (selectors) => {
      for (const sel of selectors) {
        const els = await this.driver.findElements(By.css(sel));
        if (els && els.length) return { el: els[0], selector: sel };
      }
      return null;
    };

    const trySelectors = async (selectors) => {
      if (!selectors || !selectors.length) return null;
      await this.driver.switchTo().defaultContent();
      const found = await findFirst(selectors);
      if (found && found.el) return { ...found, ctx: 'main' };
      const frameFound = await switchToFrameContaining(selectors);
      if (frameFound) {
        const found2 = await findFirst([frameFound.selector]);
        if (found2 && found2.el) return { ...found2, ctx: `iframe#${frameFound.frameIndex}` };
      }
      await this.driver.switchTo().defaultContent();
      return null;
    };

    const fillPreferredThenAuto = async (preferredSelectors, genericSelectors, value) => {
      let f = await trySelectors(preferredSelectors);
      if (!f) {
        f = await trySelectors(genericSelectors);
        if (!f) return false;
        try { await f.el.clear(); } catch {}
        await f.el.sendKeys(value);
        console.log(`✍️ Rempli via génériques: ${f.selector}${f.ctx ? ' ('+f.ctx+')' : ''}`);
        await this.driver.switchTo().defaultContent();
        return true;
      }
      try { await f.el.clear(); } catch {}
      await f.el.sendKeys(value);
      console.log(`✍️ Rempli via préférés: ${f.selector}${f.ctx ? ' ('+f.ctx+')' : ''}`);
      await this.driver.switchTo().defaultContent();
      return true;
    };

    const clickPreferredThenAuto = async (preferredSelectors, genericSelectors) => {
      let f = await trySelectors(preferredSelectors);
      if (!f) {
        f = await trySelectors(genericSelectors);
        if (!f) return null;
        await f.el.click();
        console.log(`✅ Click via génériques: ${f.selector}${f.ctx ? ' ('+f.ctx+')' : ''}`);
        await this.driver.switchTo().defaultContent();
        return f.el;
      }
      await f.el.click();
      console.log(`✅ Click via préférés: ${f.selector}${f.ctx ? ' ('+f.ctx+')' : ''}`);
      await this.driver.switchTo().defaultContent();
      return f.el;
    };

    console.log('🧾 Remplissage du formulaire de paiement...');

    // Sélecteurs préférés fournis
    const preferred = {
      number: [
        'input[name="creditCardNumber"]',
        'input[data-uia="field-creditCardNumber"]',
        'input[autocomplete="cc-number"]'
      ],
      expiryCombined: [
        'input[name="creditExpirationMonth"]',
        'input[data-uia="field-creditExpirationMonth"]',
        'input[autocomplete="cc-exp"]',
        'input[placeholder="MM/YY"]'
      ],
      cvv: [
        'input[name="creditCardSecurityCode"]',
        'input[data-uia="field-creditCardSecurityCode"]',
        'input[autocomplete="cc-csc"]'
      ],
      firstName: [
        'input[name="firstName"]',
        'input[data-uia="field-name"]',
        'input[autocomplete="cc-name"]'
      ],
      agree: [
        'input[name="hasAcceptedTermsOfUse"]',
        'input[data-uia="field-hasAcceptedTermsOfUse"]'
      ],
      submit: [
        'button[data-uia="action-submit-payment"]'
      ]
    };

    // Sélecteurs génériques (fallback automatique si préférés échouent)
    const generic = {
      number: [
        'input[autocomplete="cc-number"]', 'input[name*="card" i][name*="number" i]', '#card-number', '#cc-number'
      ],
      expiryCombined: [
        'input[autocomplete="cc-exp"]', 'input[placeholder*="MM" i]', '#card-expiry', '#cc-exp'
      ],
      cvv: [
        'input[autocomplete="cc-csc"]', 'input[name*="cvc" i], input[name*="cvv" i]', '#card-cvc', '#cc-cvv'
      ],
      firstName: [
        'input[autocomplete="cc-name"]', 'input[name*="name" i]', '#firstName'
      ],
      agree: [
        'input[type="checkbox"][name*="terms" i]', 'input[type="checkbox"][data-uia*="terms" i]', 'input[type="checkbox"][name*="accept" i]'
      ],
      submit: [
        'button[type="submit"]', 'button.nf-btn-primary', 'button[data-uia*="submit" i]', 'button[data-uia*="next" i]'
      ]
    };

    // Remplissage
    const okFirst = firstName ? await fillPreferredThenAuto(preferred.firstName, generic.firstName, firstName) : true;
    const okLast = true; // ignoré/masqué dans ce flow
    console.log('👤 Names filled:', okFirst, okLast);

    const okNumber = await fillPreferredThenAuto(preferred.number, generic.number, cardNumber);
    console.log('🧩 Card number filled:', okNumber);

    const expValue = `${String(expMonth).padStart(2,'0')}/${String(expYear).slice(-2)}`;
    const okExp = await fillPreferredThenAuto(preferred.expiryCombined, generic.expiryCombined, expValue);
    console.log('🗓️ Expiration filled:', okExp);

    const okCvv = await fillPreferredThenAuto(preferred.cvv, generic.cvv, cvv);
    console.log('🔒 CVV filled:', okCvv);

    if (agree) {
      const clickedEl = await clickPreferredThenAuto(preferred.agree, generic.agree);
      console.log('☑️ Agreement checked:', !!clickedEl);
    }

    const beforeUrl = await this.driver.getCurrentUrl();
    const submitBtn = await clickPreferredThenAuto(preferred.submit, generic.submit);
    if (!submitBtn) throw new Error('Bouton de soumission introuvable');
    try { await this.driver.wait(until.elementIsEnabled(submitBtn), 4000); } catch {}
    try { await submitBtn.click(); } catch {}
    console.log('🚀 Bouton de paiement cliqué');

    // Attendre une éventuelle redirection (changement d'URL)
    let redirected = false;
    try {
      await this.driver.wait(async () => {
        const urlNow = await this.driver.getCurrentUrl();
        return urlNow !== beforeUrl;
      }, 10000);
      redirected = true;
    } catch {
      redirected = false;
    }

    if (!redirected) {
      // Prendre une capture d'écran et l'enregistrer avec l'email comme nom de fichier
      try {
        const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
          fs.mkdirSync(screenshotsDir, { recursive: true });
        }
        const safeEmail = (email || 'unknown').replace(/[^a-zA-Z0-9._-]+/g, '_');
        const filePath = path.join(screenshotsDir, `${safeEmail}.png`);
        const image = await this.driver.takeScreenshot();
        fs.writeFileSync(filePath, image, 'base64');
        console.log(`📸 Screenshot sauvegardé: ${filePath}`);

        // Fermer le navigateur même en cas d'échec
        try {
          if (this.cookieUpdateInterval) { clearInterval(this.cookieUpdateInterval); this.cookieUpdateInterval = null; }
          if (this.sessionCheckInterval) { clearInterval(this.sessionCheckInterval); this.sessionCheckInterval = null; }
          await this.driver.quit();
          this.driver = null;
          this.isSessionActive = false;
          console.log('🧹 Navigateur fermé après échec (pas de redirection)');
        } catch (e2) {
          console.log('⚠️ Impossible de fermer le navigateur proprement (échec):', e2.message);
        }

        return { success: false, message: 'Soumission non redirigée, possible erreur de paiement', screenshot: filePath };
      } catch (e) {
        // Essayer quand même de fermer le navigateur
        try {
          if (this.cookieUpdateInterval) { clearInterval(this.cookieUpdateInterval); this.cookieUpdateInterval = null; }
          if (this.sessionCheckInterval) { clearInterval(this.sessionCheckInterval); this.sessionCheckInterval = null; }
          await this.driver.quit();
          this.driver = null;
          this.isSessionActive = false;
        } catch {}
        return { success: false, message: 'Soumission non redirigée et échec screenshot', error: e.message };
      }
    }

    const afterUrl = await this.driver.getCurrentUrl();
    // Fermer le navigateur avant de répondre succès
    try {
      if (this.cookieUpdateInterval) { clearInterval(this.cookieUpdateInterval); this.cookieUpdateInterval = null; }
      if (this.sessionCheckInterval) { clearInterval(this.sessionCheckInterval); this.sessionCheckInterval = null; }
      await this.driver.quit();
      this.driver = null;
      this.isSessionActive = false;
      console.log('🧹 Navigateur fermé après redirection réussie');
    } catch (e) {
      console.log('⚠️ Impossible de fermer le navigateur proprement:', e.message);
    }
    return { success: true, redirected: true, url: afterUrl };
  }

  /**
   * Appel API Netflix pour l'étape paiement (creditoption) depuis le navigateur
   */
  async callNetflixAPICreditOption(params = {}, headerOverrides = {}) {
    try {
      if (!this.driver) throw new Error('Session non initialisée');

      console.log('💳 Appel API Netflix (creditoption) depuis le navigateur...');

      // S'assurer d'être sur /signup/creditoption
      let currentUrl = await this.driver.getCurrentUrl();
      if (!currentUrl.includes('/signup/creditoption')) {
        // Assurer le flow minimal: /signup/planform => /signup/regform => /signup/creditoption
        if (!currentUrl.includes('/signup/regform')) {
          await this.driver.get('https://www.netflix.com/signup/regform');
          await this.driver.sleep(800);
        }
        await this.driver.get('https://www.netflix.com/signup/creditoption');
        await this.driver.sleep(1200);
      }

      // Ready
      await this.driver.wait(async () => {
        const rs = await this.driver.executeScript('return document.readyState');
        return rs === 'complete';
      }, 12000);

      console.log('📄 Page creditoption prête');

      // Mode redirection seule: ne pas exécuter la requête pathEvaluator, juste confirmer l'URL
      if (params && params.redirectOnly) {
        return {
          success: true,
          redirectedOnly: true,
          url: await this.driver.getCurrentUrl()
        };
      }

      // Defaults structure based on provided sample
      const defaultParams = {
        flow: 'signupSimplicity',
        mode: 'creditOptionMode',
        action: 'nextAction',
        fields: {
          creditData: { value: '' },
          paymentChoice: { value: 'creditOption' },
          emvco3dsDeviceDataResponseFallback: { value: '' },
          emvco3dsAuthenticationWindowSize: { value: '04' },
          firstName: { value: '' },
          lastName: { value: '' },
          hasAcceptedTermsOfUse: { value: true },
          recaptchaResponseToken: { value: '' },
          recaptchaError: {},
          recaptchaResponseTime: { value: 0 },
          lastFour: { value: '' },
          cardBin: { value: '' },
          creditCardSecurityCode: { value: '' },
          cvvRequested: { value: true },
          previousMode: ''
        }
      };
      const { redirectOnly, ...rest } = params || {};
      const finalParams = { ...defaultParams, ...rest };

      // Build API URL
      const apiUrl = 'https://www.netflix.com/api/aui/pathEvaluator/web/%5E2.0.0?' +
        new URLSearchParams({
          landingURL: '/signup/creditoption',
          landingOrigin: 'https://www.netflix.com',
          inapp: 'false',
          isConsumptionOnly: 'false',
          logConsumptionOnly: 'false',
          languages: 'en-US',
          netflixClientPlatform: 'browser',
          method: 'call',
          callPath: '["aui","moneyball","next"]',
          falcor_server: '0.1.0'
        }).toString();

      // Extract dynamic data from page (authURL, uiVersion)
      let pageMeta = { authURL: null, uiVersion: null };
      try {
        pageMeta = await this.driver.executeScript(`
          const out = { authURL: null, uiVersion: null };
          try {
            if (window.netflix && window.netflix.reactContext) {
              const ctx = window.netflix.reactContext;
              if (ctx.models && ctx.models.userInfo && ctx.models.userInfo.data) {
                out.authURL = ctx.models.userInfo.data.authURL;
              }
            }
          } catch {}
          try {
            // Try to read a uiVersion from script text or meta
            const meta = document.querySelector('meta[name="uiVersion"]');
            if (meta) out.uiVersion = meta.content;
          } catch {}
          if (!out.uiVersion) {
            // Heuristic: read from data-react-helmet or any script if present
            const scripts = document.querySelectorAll('script');
            for (let s of scripts) {
              const m = s.textContent.match(/uiVersion\"?\s*[:=]\s*\"([^"]+)\"/);
              if (m) { out.uiVersion = m[1]; break; }
            }
          }
          return out;
        `);
      } catch {}

      const uiVersion = headerOverrides.uiVersion || pageMeta.uiVersion || 'vae8ea59a';
      const authURL = pageMeta.authURL || headerOverrides.authURL || '';

      // Allocations and tracing defaults
      const allocations = headerOverrides.allocations || '{}';
      const tracingId = headerOverrides.tracingId || uiVersion; // often matches
      const tracingGroupId = headerOverrides.tracingGroupId || 'www.netflix.com';

      // Execute fetch in browser
      const result = await this.driver.executeAsyncScript(`
        const cb = arguments[arguments.length - 1];
        const apiUrl = arguments[0];
        const params = arguments[1];
        const meta = arguments[2];
        const hdr = arguments[3];

        const formData = new URLSearchParams({
          allocations: hdr.allocations || '{}',
          tracingId: hdr.tracingId || meta.uiVersion || 'va000000',
          tracingGroupId: hdr.tracingGroupId || 'www.netflix.com',
          authURL: meta.authURL || '',
          param: JSON.stringify(params)
        });

        const headers = Object.assign({
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': '*/*',
          'X-Netflix.uiVersion': meta.uiVersion || 'va000000',
          'X-Netflix.esnPrefix': 'NFCDFF-LX-',
          'X-Netflix.browserName': 'Firefox',
          'X-Netflix.browserVersion': '128',
          'X-Netflix.osName': 'Linux',
          'X-Netflix.osFullName': 'Linux',
          'X-Netflix.osVersion': '0.0.0',
          'X-Netflix.clientType': 'akira',
          'x-netflix.client.request.name': 'ui/xhrUnclassified',
          'x-netflix.request.attempt': '1',
          'x-netflix.request.client.context': '{"appstate":"foreground"}'
        }, hdr.extra || {});

        fetch(apiUrl, { method: 'POST', headers, body: formData.toString() })
          .then(r => r.text().then(t => ({
            status: r.status,
            statusText: r.statusText,
            headers: Object.fromEntries(r.headers.entries()),
            body: t,
            ok: r.ok
          })))
          .then(out => { try { out.data = JSON.parse(out.body); } catch { out.data = out.body; } cb(out); })
          .catch(err => cb({ success: false, error: err.message, status: 0 }));
      `, apiUrl, finalParams, { authURL, uiVersion }, { allocations, tracingId, tracingGroupId, extra: headerOverrides.extra || {} });

      console.log('✅ Réponse API (creditoption):', result.status);
      return {
        success: result.ok || result.status === 200,
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        data: result.data,
        fromBrowser: true
      };
    } catch (error) {
      console.error('❌ Erreur appel API Netflix (creditoption):', error);
      return { success: false, message: error.message, fromBrowser: true };
    }
  }

  /**
   * Appel API Netflix pour l'étape regform (registration) depuis le navigateur
   */
  async callNetflixAPIRegistration(params = {}) {
    try {
      if (!this.driver) {
        throw new Error('Session non initialisée');
      }

      console.log('🚀 Appel API Netflix (regform) depuis le navigateur...');

      // Assurer le flow: /signup -> click Next -> /signup/planform -> /signup/regform
      let currentUrl = await this.driver.getCurrentUrl();
      if (!currentUrl.includes('/signup/regform')) {
        console.log('📍 Mise en contexte regform...');

        // Aller sur /signup si nécessaire
        if (!currentUrl.includes('/signup')) {
          await this.driver.get('https://www.netflix.com/signup');
          await this.driver.sleep(1500);
        }

        // Si pas encore sur planform, réutiliser la logique de Next pour y aller
        currentUrl = await this.driver.getCurrentUrl();
        if (!currentUrl.includes('/signup/planform')) {
          console.log('➡️ Passage à planform...');
          try {
            const { By, until } = require('selenium-webdriver');

            // Accepter les cookies si présents (best-effort)
            try {
              const cookieSelectors = [
                'button[data-uia="cookie-disclosure-button-accept"]',
                '#onetrust-accept-btn-handler'
              ];
              for (const sel of cookieSelectors) {
                const elements = await this.driver.findElements(By.css(sel));
                if (elements && elements.length) { await elements[0].click(); break; }
              }
            } catch {}

            const nextSelectors = [
              'button[data-uia="continue-button"]',
              'button[data-uia="next-button"]',
              'button[type="submit"]'
            ];
            let nextBtn = null;
            for (const sel of nextSelectors) {
              try {
                nextBtn = await this.driver.wait(until.elementLocated(By.css(sel)), 4000);
                break;
              } catch {}
            }
            if (nextBtn) {
              try { await this.driver.wait(until.elementIsEnabled(nextBtn), 2000); } catch {}
              await nextBtn.click();
              await this.driver.wait(async () => {
                const url = await this.driver.getCurrentUrl();
                return url.includes('/signup/planform');
              }, 10000);
            } else {
              // Fallback direct
              await this.driver.get('https://www.netflix.com/signup/planform');
            }
          } catch (e) {
            console.log('⚠️ Échec passage planform, fallback direct:', e.message);
            await this.driver.get('https://www.netflix.com/signup/planform');
          }
          await this.driver.sleep(1000);
        }

        // Maintenant tenter d'aller vers /signup/regform
        console.log('➡️ Passage à regform...');
        await this.driver.get('https://www.netflix.com/signup/regform');
        await this.driver.sleep(1000);
      }

      // Attendre readiness
      await this.driver.wait(async () => {
        const readyState = await this.driver.executeScript('return document.readyState');
        return readyState === 'complete';
      }, 10000);

      console.log('📄 Page regform prête');

      // Params par défaut registration
      const defaultParams = {
        flow: 'signupSimplicity',
        mode: 'registration',
        action: 'registerOnlyAction',
        fields: {
          email: { value: '' },
          password: { value: '' },
          emailPreference: { value: false },
          previousMode: 'registrationWithContext'
        }
      };
      const finalParams = { ...defaultParams, ...params };

      // Construire l'URL pour regform
      const apiUrl = 'https://www.netflix.com/api/aui/pathEvaluator/web/%5E2.0.0?' +
        new URLSearchParams({
          landingURL: '/signup/regform',
          landingOrigin: 'https://www.netflix.com',
          inapp: 'false',
          isConsumptionOnly: 'false',
          logConsumptionOnly: 'false',
          languages: 'en-US',
          netflixClientPlatform: 'browser',
          method: 'call',
          callPath: '["aui","moneyball","next"]',
          falcor_server: '0.1.0'
        }).toString();

      // Récupérer l'authURL dynamique
      let authURL = null;
      try {
        authURL = await this.driver.executeScript(`
          if (window.netflix && window.netflix.reactContext) {
            const ctx = window.netflix.reactContext;
            if (ctx.models && ctx.models.userInfo && ctx.models.userInfo.data) {
              return ctx.models.userInfo.data.authURL;
            }
          }
          const scripts = document.querySelectorAll('script');
          for (let s of scripts) {
            const m = s.textContent.match(/"authURL":"([^"]+)"/);
            if (m) return m[1];
          }
          return null;
        `);
      } catch {}

      // Appel fetch depuis le navigateur
      const result = await this.driver.executeAsyncScript(`
        const callback = arguments[arguments.length - 1];
        const apiUrl = arguments[0];
        const params = arguments[1];
        const authURL = arguments[2];

        const formData = new URLSearchParams({
          allocations: '{}',
          tracingId: 'v7287ca98',
          tracingGroupId: 'www.netflix.com',
          authURL: authURL || '',
          param: JSON.stringify(params)
        });

        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': '*/*',
            'X-Netflix.clientType': 'akira',
            'X-Netflix.browserName': 'Firefox',
            'X-Netflix.browserVersion': '128',
            'X-Netflix.osName': 'Linux',
            'X-Netflix.uiVersion': 'v7287ca98'
          },
          body: formData.toString()
        })
        .then(response => response.text().then(text => ({
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: text,
          ok: response.ok
        })))
        .then(result => {
          try { result.data = JSON.parse(result.body); } catch { result.data = result.body; }
          callback(result);
        })
        .catch(err => callback({ success: false, error: err.message, status: 0 }));
      `, apiUrl, finalParams, authURL);

      console.log('✅ Réponse API (regform):', result.status);
      return {
        success: result.ok || result.status === 200,
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        data: result.data,
        fromBrowser: true
      };
    } catch (error) {
      console.error('❌ Erreur appel API Netflix (regform):', error);
      return { success: false, message: error.message, fromBrowser: true };
    }
  }

  async initializeDriver() {
    try {
      console.log("🔧 Initialisation du driver Selenium...");
      const options = new firefox.Options();
      const headless = String(process.env.HEADLESS || 'true').toLowerCase() !== 'false';
      // Activer le mode headless si demandé
      if (headless) {
        try { options.headless(); } catch (e) { options.addArguments("--headless"); }
      }

      // Options pour la stabilité
      options.addArguments("--no-sandbox");
      options.addArguments("--disable-dev-shm-usage");
      options.addArguments("--disable-web-security");

      // Définir un User-Agent spécifique (Netflix)
      const NETFLIX_UA =
        "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0";
      // Argument CLI (peut ne pas être pris en compte selon les versions)
      options.addArguments(`--user-agent=${NETFLIX_UA}`);
      // Préférence Firefox pour garantir la prise en compte
      options.setPreference("general.useragent.override", NETFLIX_UA);

      // Construire le driver Firefox
      this.driver = await new Builder()
        .forBrowser("firefox")
        .setFirefoxOptions(options)
        .build();

      // Vérifier et logger le User-Agent réel utilisé par Firefox
      try {
        const ua = await this.driver.executeScript("return navigator.userAgent;");
        console.log("🎯 UA détecté dans Firefox:", ua);
      } catch (e) {
        console.log("⚠️ Impossible de lire le UA:", e.message);
      }

      // Définir la taille de la fenêtre seulement en mode graphique
      if (!headless) {
        await this.driver.manage().window().setRect({ width: 1366, height: 768 });
      }

      // Définir les timeouts (augmentés pour éviter les timeouts prématurés)
      await this.driver.manage().setTimeouts({
        implicit: 20000, // 20s pour trouver les éléments
        pageLoad: 600000, // 2 minutes pour charger les pages
        script: 30000, // 30s pour les scripts
      });

      console.log(`✅ Driver Selenium initialisé (${headless ? 'headless' : 'graphique'})`);
      return true;
    } catch (error) {
      console.error("❌ Erreur initialisation driver:", error);
      throw error;
    }
  }

/**
 * Initialise et ouvre Netflix signup
 */
async initializeSession() {
  try {
    console.log("🚀 Initialisation de la session Netflix...");

      // Initialiser le driver directement
      await this.initializeDriver();

      // Naviguer vers Netflix signup avec timeout
      console.log("📱 Navigation vers Netflix signup...");

      // Utiliser Promise.race pour ajouter un timeout
      const navigationPromise = this.driver.get(
        "https://www.netflix.com/signup"
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(new Error("Timeout: Navigation trop longue (2 minutes)")),
          600000 // 2 minutes, cohérent avec pageLoad timeout
        )
      );

      await Promise.race([navigationPromise, timeoutPromise]);
      console.log("✅ Page Netflix chargée");

      // Sauvegarder l'HTML et une capture d'écran pour diagnostic immédiat
      try {
        const html = await this.driver.getPageSource();
        fs.writeFileSync("netflix.html", html);
        const screenshot = await this.driver.takeScreenshot();
        fs.writeFileSync("netflix.png", screenshot, "base64");
        console.log("📄 HTML sauvegardé: netflix.html | 📸 Screenshot: netflix.png");
      } catch (e) {
        console.log("⚠️ Impossible de sauvegarder HTML/screenshot:", e.message);
      }

      // Attendre que la page se charge complètement
      await this.driver.sleep(5000);

      // Vérifier que nous sommes bien sur Netflix
      const currentUrl = await this.driver.getCurrentUrl();
      if (!currentUrl.includes("netflix.com")) {
        throw new Error(`URL inattendue: ${currentUrl}`);
      }

      // Récupérer les cookies initiaux
      console.log("🍪 Récupération des cookies initiaux...");
      await this.updateCookies();

      this.isSessionActive = true;
      console.log("✅ Session Netflix initialisée avec succès!");
      console.log(
        `📊 ${
          Object.keys(this.cookies.individual || {}).length
        } cookies Netflix récupérés`
      );

      // Démarrer la surveillance automatique
      this.startCookieMonitoring();
      this.startSessionKeepAlive();

      return {
        success: true,
        message: "Session Netflix active - Fenêtre Firefox ouverte",
        cookies: this.cookies,
        url: currentUrl,
      };
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation:", error);
      return {
        success: false,
        message: error.message,
        cookies: {},
      };
    }
  }

  /**
   * Met à jour les cookies depuis le navigateur
   */
  async updateCookies() {
    try {
      if (!this.driver) {
        throw new Error("Driver non initialisé");
      }

      const browserCookies = await this.driver.manage().getCookies();

      // Convertir en format utilisable
      const cookieString = browserCookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");

      // Stocker les cookies importants séparément
      const importantCookies = {};
      const netflixCookieNames = [
        "NetflixId",
        "SecureNetflixId",
        "nfvdid",
        "flwssn",
        "gsid",
        "OptanonConsent",
        "sawContext",
      ];

      browserCookies.forEach((cookie) => {
        if (netflixCookieNames.includes(cookie.name)) {
          importantCookies[cookie.name] = cookie.value;
        }
      });

      this.cookies = {
        cookieString,
        individual: importantCookies,
        raw: browserCookies,
        lastUpdated: new Date().toISOString(),
      };

      console.log(
        `🍪 Cookies mis à jour: ${
          Object.keys(importantCookies).length
        } cookies Netflix trouvés`
      );

      return this.cookies;
    } catch (error) {
      console.error("❌ Erreur mise à jour cookies:", error);
      throw error;
    }
  }

  /**
   * Démarre la surveillance automatique des cookies
   */
  startCookieMonitoring() {
    console.log("👀 Démarrage surveillance cookies (toutes les 30s)...");

    this.cookieUpdateInterval = setInterval(async () => {
      try {
        if (this.isSessionActive && this.driver) {
          await this.updateCookies();
        }
      } catch (error) {
        console.error("⚠️ Erreur surveillance cookies:", error.message);
      }
    }, 30000); // Toutes les 30 secondes
  }

  /**
   * Maintient la session active en rafraîchissant périodiquement
   */
  startSessionKeepAlive() {
    console.log("💓 Démarrage keep-alive session (toutes les 5 minutes)...");

    this.sessionCheckInterval = setInterval(async () => {
      try {
        if (this.isSessionActive && this.driver) {
          // Vérifier si la page est toujours active
          const currentUrl = await this.driver.getCurrentUrl();

          if (!currentUrl.includes("netflix.com")) {
            console.log("🔄 Retour vers Netflix...");
            await this.driver.get("https://www.netflix.com/signup");
            await this.driver.sleep(2000);
          }

          // Petit refresh pour maintenir la session
          await this.driver.executeScript("document.title = document.title;");
          console.log("💓 Session maintenue active");
        }
      } catch (error) {
        console.error("⚠️ Erreur keep-alive:", error.message);
      }
    }, 300000); // Toutes les 5 minutes
  }

  /**
   * Récupère les cookies actuels
   */
  getCurrentCookies() {
    return {
      success: this.isSessionActive,
      cookies: this.cookies,
      sessionActive: this.isSessionActive,
      lastUpdated: this.cookies.lastUpdated || null,
    };
  }

  /**
   * Navigue vers une page spécifique de Netflix
   */
  async navigateToPage(path = "/signup") {
    try {
      if (!this.driver) {
        throw new Error("Session non initialisée");
      }

      const url = `https://www.netflix.com${path}`;
      console.log(`🧭 Navigation vers: ${url}`);

      await this.driver.get(url);
      await this.driver.sleep(2000);

      // Mettre à jour les cookies après navigation
      await this.updateCookies();

      return {
        success: true,
        currentUrl: await this.driver.getCurrentUrl(),
        cookies: this.cookies,
      };
    } catch (error) {
      console.error("❌ Erreur navigation:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Ferme la session et nettoie les ressources
   */
  async closeSession() {
    try {
      console.log("🛑 Fermeture de la session Netflix...");

      // Arrêter les intervalles
      if (this.cookieUpdateInterval) {
        clearInterval(this.cookieUpdateInterval);
      }
      if (this.sessionCheckInterval) {
        clearInterval(this.sessionCheckInterval);
      }

      // Fermer le navigateur
      if (this.driver) {
        await this.driver.quit();
      }

      this.isSessionActive = false;
      this.cookies = {};

      console.log("✅ Session fermée avec succès");

      return { success: true, message: "Session fermée" };
    } catch (error) {
      console.error("❌ Erreur fermeture session:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Redémarre la session si nécessaire
   */
  async restartSession() {
    console.log("🔄 Redémarrage de la session...");
    await this.closeSession();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return await this.initializeSession();
  }

  /**
   * Fait un appel API Netflix directement depuis le navigateur avec les cookies
   */

/**
 * Récupère les cookies actuels
 */
getCurrentCookies() {
return {
  success: this.isSessionActive,
  cookies: this.cookies,
  sessionActive: this.isSessionActive,
  lastUpdated: this.cookies.lastUpdated || null,
};
}

/**
 * Navigue vers une page spécifique de Netflix
 */
async navigateToPage(path = "/signup") {
try {
  if (!this.driver) {
    throw new Error("Session non initialisée");
  }

  const url = `https://www.netflix.com${path}`;
  console.log(`🧭 Navigation vers: ${url}`);

  await this.driver.get(url);
  await this.driver.sleep(2000);

  // Mettre à jour les cookies après navigation
  await this.updateCookies();

  return {
    success: true,
    currentUrl: await this.driver.getCurrentUrl(),
    cookies: this.cookies,
  };
} catch (error) {
  console.error("❌ Erreur navigation:", error);
  return {
    success: false,
    message: error.message,
  };
}
}

/**
 * Ferme la session et nettoie les ressources
 */
async closeSession() {
try {
  console.log("🛑 Fermeture de la session Netflix...");

  // Arrêter les intervalles
  if (this.cookieUpdateInterval) {
    clearInterval(this.cookieUpdateInterval);
  }
  if (this.sessionCheckInterval) {
    clearInterval(this.sessionCheckInterval);
  }

  // Fermer le navigateur
  if (this.driver) {
    await this.driver.quit();
  }

  this.isSessionActive = false;
  this.cookies = {};

  console.log("✅ Session fermée avec succès");

  return { success: true, message: "Session fermée" };
} catch (error) {
  console.error("❌ Erreur fermeture session:", error);
  return { success: false, message: error.message };
}
}

/**
 * Redémarre la session si nécessaire
 */
async restartSession() {
console.log("🔄 Redémarrage de la session...");
await this.closeSession();
await new Promise((resolve) => setTimeout(resolve, 2000));
return await this.initializeSession();
}

/**
 * Fait un appel API Netflix directement depuis le navigateur avec les cookies
 */
async callNetflixAPI(params = {}) {
try {
  if (!this.driver) {
    throw new Error('Session non initialisée');
  }

  console.log('🚀 Appel API Netflix depuis le navigateur...');
  
  // D'abord, s'assurer qu'on est dans le bon contexte d'inscription
  console.log('📍 Navigation vers le contexte d\'inscription...');
  const currentUrl = await this.driver.getCurrentUrl();
  
  if (!currentUrl.includes('/signup/planform')) {
    console.log('🔄 Démarrage du flow d\'inscription Netflix...');
    
    // Étape 1: Aller sur /signup
    await this.driver.get('https://www.netflix.com/signup');
    await this.driver.sleep(3000);
    console.log('✅ Page /signup chargée');
    
    // Étape 2: Cliquer sur le bouton "Next" pour aller vers planform
    try {
      const { By, until } = require('selenium-webdriver');

      // Préparer cache sélecteur du bouton Next
      const flowCacheDir = path.join(__dirname, 'selectors');
      const flowCacheFile = path.join(flowCacheDir, 'flow-selectors.json');
      let flowCache = {};
      try { if (fs.existsSync(flowCacheFile)) flowCache = JSON.parse(fs.readFileSync(flowCacheFile, 'utf8') || '{}'); } catch {}
      const saveFlowCache = () => {
        try {
          if (!fs.existsSync(flowCacheDir)) fs.mkdirSync(flowCacheDir, { recursive: true });
          fs.writeFileSync(flowCacheFile, JSON.stringify(flowCache, null, 2), 'utf8');
        } catch (e) { console.log('⚠️ Impossible d\'écrire flow-selectors:', e.message); }
      };
      
      // 1) Essayer le sélecteur mis en cache IMMÉDIATEMENT (optimisé)
      let nextButton = null;
      let navigatedFromCache = false;
      let attemptedNextClick = false; // garde-fou anti double-clic
      const cachedNext = flowCache['signupNext'];
      if (cachedNext && cachedNext.selector) {
        try {
          const t0 = Date.now();
          if (cachedNext.selectorType === 'xpath') {
            const found = await this.driver.findElements(By.xpath(cachedNext.selector));
            nextButton = found && found.length ? found[0] : null;
          } else {
            const found = await this.driver.findElements(By.css(cachedNext.selector));
            nextButton = found && found.length ? found[0] : null;
          }
          if (nextButton) {
            console.log(`♻️ Bouton Next trouvé via cache: ${cachedNext.selector}`);
            try {
              try { await this.driver.wait(until.elementIsEnabled(nextButton), 1500); } catch {}
              attemptedNextClick = true;
              await nextButton.click();
              console.log('🎯 Bouton Next (cache) cliqué!');
              await this.driver.wait(async () => {
                const url = await this.driver.getCurrentUrl();
                return url.includes('/signup/planform') || url.includes('/planform');
              }, 6000);
              const dt = Date.now() - t0;
              console.log(`✅ Navigation vers planform réussie (via cache) ⏱ ${dt}ms`);
              navigatedFromCache = true;
            } catch (e) {
              const emsg = e && e.message ? e.message : String(e);
              if (emsg.toLowerCase().includes('stale')) {
                console.log('ℹ️ StaleElement après clic cache; vérification de la navigation...');
                try {
                  await this.driver.wait(async () => {
                    const url = await this.driver.getCurrentUrl();
                    return url.includes('/signup/planform') || url.includes('/planform');
                  }, 3000);
                  const dt = Date.now() - t0;
                  console.log(`✅ Navigation confirmée après stale (via cache) ⏱ ${dt}ms`);
                  navigatedFromCache = true;
                } catch {
                  console.log('❌ StaleElement sans navigation détectée (mode strict): aucun retry de clic.');
                  return { success: false, message: 'StaleElement après clic Next (cache) sans navigation' };
                }
              }
              if (!navigatedFromCache) {
                console.log('⚠️ Clic via sélecteur cache a échoué, on retombe sur la détection…');
                nextButton = null;
              }
            }
          }
        } catch {}
      }

      // Déclaration des sélecteurs fallback
      const nextButtonSelectors = [
        'button[data-uia="continue-button"]',
        'button[data-uia="next-button"]',
        'button.nf-btn-primary',
        'button.nf-btn-continue',
        '.btn-continue',
        '.continue-button',
        'button[type="submit"]'
      ];
      
      if (!navigatedFromCache && !attemptedNextClick) {
        if (!nextButton) {
          console.log('🔍 Recherche du bouton Next (fallback)...');
          for (const selector of nextButtonSelectors) {
            try {
              const btn = await this.driver.wait(
                until.elementLocated(By.css(selector)), 
                3000
              );
              nextButton = btn;
              console.log(`✅ Bouton trouvé avec sélecteur: ${selector}`);
              // Sauver dans le cache
              flowCache['signupNext'] = { selectorType: 'css', selector, updatedAt: new Date().toISOString() };
              saveFlowCache();
              break;
            } catch (e) {
              // console.log(`⚠️ Sélecteur ${selector} non trouvé`);
            }
          }
        }

        // Si non trouvé via CSS, tenter via XPath par texte
        if (!nextButton) {
          console.log('🔍 Recherche du bouton Next par texte (fallback XPath)...');
          const xpaths = [
            "//button[normalize-space()='Next']",
            "//button[normalize-space()='Continue']",
            "//button[normalize-space()='Suivant']",
            "//button[normalize-space()='Continuer']",
            "//button//*[text()[contains(.,'Next')]]/ancestor::button",
            "//button//*[text()[contains(.,'Continue')]]/ancestor::button"
          ];
          for (const xp of xpaths) {
            try {
              const btn = await this.driver.wait(
                until.elementLocated(By.xpath(xp)),
                3000
              );
              nextButton = btn;
              console.log(`✅ Bouton trouvé avec XPath: ${xp}`);
              // Sauver dans le cache
              flowCache['signupNext'] = { selectorType: 'xpath', selector: xp, updatedAt: new Date().toISOString() };
              saveFlowCache();
              break;
            } catch (e) {
              // console.log(`⚠️ XPath non trouvé: ${xp}`);
            }
          }
        }

        if (nextButton && !attemptedNextClick) {
          // Attendre que le bouton soit cliquable (meilleur effort)
          try { await this.driver.wait(until.elementIsEnabled(nextButton), 3000); } catch {}
          // Cliquer le bouton
          attemptedNextClick = true;
          await nextButton.click();
          console.log('🎯 Bouton Next cliqué!');
          // Attendre la navigation vers planform
          await this.driver.wait(async () => {
            const url = await this.driver.getCurrentUrl();
            return url.includes('/signup/planform') || url.includes('/planform');
          }, 10000);
          console.log('✅ Navigation vers planform réussie');
        } else {
          console.log('❌ Bouton Next non trouvé (mode strict): aucun accès direct ni autre clic.');
          return { success: false, message: 'Next/Continue introuvable: mode strict sans navigation forcée' };
        }
      } else {
        console.log('🛑 Mode strict: navigation via cache confirmée, aucune autre interaction.');
      }
          
        } catch (error) {
          console.log('⚠️ Erreur lors du clic Next:', error.message);
          console.log('⛔ Mode strict: aucun accès direct ni second clic.');
          return { success: false, message: `Erreur clic Next (mode strict): ${error.message}` };
        }
        
        console.log('✅ Contexte planform établi (fin de l\'étape)');
      }
      
      // Attendre que la page soit complètement chargée
      await this.driver.wait(async () => {
        const readyState = await this.driver.executeScript('return document.readyState');
        return readyState === 'complete';
      }, 10000);
      
      console.log('📄 Page prête pour l\'appel API');

      // Paramètres par défaut
      const defaultParams = {
        flow: "signupSimplicity",
        mode: "planSelection", 
        action: "planSelectionAction",
        fields: {
          planChoice: { value: "4120" },
          previousMode: "planSelectionWithContext"
        }
      };

      // Merger avec les paramètres fournis
      const finalParams = { ...defaultParams, ...params };

      // Construire l'URL de l'API Netflix
      const apiUrl = 'https://www.netflix.com/api/aui/pathEvaluator/web/%5E2.0.0?' + 
        new URLSearchParams({
          landingURL: '/signup/planform',
          landingOrigin: 'https://www.netflix.com',
          inapp: 'false',
          isConsumptionOnly: 'false',
          logConsumptionOnly: 'false',
          languages: 'en-US',
          netflixClientPlatform: 'browser',
          method: 'call',
          callPath: '["aui","moneyball","next"]',
          falcor_server: '0.1.0'
        }).toString();

      // Récupérer l'authURL dynamique depuis la page
      let authURL = 'c1.1755167206419.AgiMlOvcAxIgiwRrZHLkx4IzxQFQw5QHkv1uZ2QSEeNcdx7aStj1uf4YAg==';
      try {
        authURL = await this.driver.executeScript(`
          // Chercher l'authURL dans les scripts ou variables globales
          if (window.netflix && window.netflix.reactContext) {
            return window.netflix.reactContext.models.userInfo.data.authURL;
          }
          // Ou dans les éléments meta
          const authMeta = document.querySelector('meta[name="authURL"]');
          if (authMeta) return authMeta.content;
          
          // Ou dans les scripts inline
          const scripts = document.querySelectorAll('script');
          for (let script of scripts) {
            const match = script.textContent.match(/"authURL":"([^"]+)"/);
            if (match) return match[1];
          }
          
          return null;
        `);
        
        if (authURL) {
          console.log('🔑 AuthURL dynamique récupéré');
        } else {
          console.log('⚠️ AuthURL dynamique non trouvé, utilisation de la valeur par défaut');
          authURL = 'c1.1755167206419.AgiMlOvcAxIgiwRrZHLkx4IzxQFQw5QHkv1uZ2QSEeNcdx7aStj1uf4YAg==';
        }
      } catch (error) {
        console.log('⚠️ Erreur récupération authURL:', error.message);
      }

      // Faire la requête depuis le navigateur avec fetch
      const result = await this.driver.executeAsyncScript(`
        const callback = arguments[arguments.length - 1];
        const apiUrl = arguments[0];
        const params = arguments[1];
        const authURL = arguments[2];
        
        // Préparer les données du formulaire
        const formData = new URLSearchParams({
          allocations: '{}',
          tracingId: 'v7287ca98',
          tracingGroupId: 'www.netflix.com',
          authURL: authURL,
          param: JSON.stringify(params)
        });

        // Faire la requête fetch depuis le navigateur
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': '*/*',
            'X-Netflix.clientType': 'akira',
            'X-Netflix.browserName': 'Firefox',
            'X-Netflix.browserVersion': '128',
            'X-Netflix.osName': 'Linux',
            'X-Netflix.uiVersion': 'v7287ca98'
          },
          body: formData.toString()
        })
        .then(response => {
          return response.text().then(text => ({
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: text,
            ok: response.ok
          }));
        })
        .then(result => {
          // Essayer de parser le JSON
          try {
            result.data = JSON.parse(result.body);
          } catch (e) {
            result.data = result.body;
          }
          callback(result);
        })
        .catch(error => {
          callback({
            success: false,
            error: error.message,
            status: 0
          });
        });
      `, apiUrl, finalParams, authURL);

      console.log('✅ Réponse API Netflix reçue:', result.status);
      
      return {
        success: result.ok || result.status === 200,
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        data: result.data,
        fromBrowser: true
      };

    } catch (error) {
      console.error('❌ Erreur appel API Netflix:', error);
      return {
        success: false,
        message: error.message,
        fromBrowser: true
      };
    }
  }

  /**
   * Obtient le statut de la session
   */
  getSessionStatus() {
    return {
      active: this.isSessionActive,
      cookiesCount: Object.keys(this.cookies.individual || {}).length,
      lastCookieUpdate: this.cookies.lastUpdated,
      monitoringActive: !!this.cookieUpdateInterval,
      keepAliveActive: !!this.sessionCheckInterval,
    };
  }
}

module.exports = { NetflixCookieService };
