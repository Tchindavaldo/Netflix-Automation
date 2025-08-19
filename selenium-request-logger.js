const fs = require("fs");
const path = require("path");
const { Builder, By, until } = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");

const LOG_FILE = path.join(__dirname, "netflix-requests.log");
const REPORT_FILE = path.join(__dirname, "netflix-requests-report.json");

function ts() {
  return new Date().toISOString();
}

// Script injecté dans la page pour intercepter fetch/XHR/form POST
const INJECT_LOGGER_SCRIPT = `
(function installLogger(){
  try {
    if (window.__requestLoggerInstalled) return true;
    window.__requestLoggerInstalled = true;
    window.__capturedRequests = window.__capturedRequests || [];
    window.__startMembershipClicked = window.__startMembershipClicked || false;
    function capture(entry){
      try { entry.afterStartMembership = !!window.__startMembershipClicked; window.__capturedRequests.push(entry); } catch(e) {}
      try { console.log('[LOGGER]', JSON.stringify(entry)); } catch(e) {}
    }
    function armCapture(reason){
      try {
        window.__startMembershipClicked = true;
        window.__startMembershipClickTs = Date.now();
        window.__startMembershipReason = reason || '';
        try { console.log('[LOGGER] capture-armed', reason || ''); } catch(e) {}
      } catch(e) {}
    }
    window.__armCapture = armCapture;

    // Utilitaires
    function headersToObject(h){
      const o = {}; if (!h) return o;
      try {
        if (typeof h.forEach === 'function') { h.forEach((v,k)=>o[k]=v); return o; }
        if (Array.isArray(h)) { for (const [k,v] of h) o[k]=v; return o; }
        if (typeof h === 'object') { return Object.assign({}, h); }
      } catch(err) {}
      return o;
    }
    function bodyToString(b){
      try {
        if (b == null) return null;
        if (typeof b === 'string') return b;
        if (b instanceof URLSearchParams) return b.toString();
        if (b instanceof FormData) { const o={}; for (const [k,v] of b.entries()) o[k]=v; return JSON.stringify(o); }
        if (typeof b === 'object' && !(b instanceof Blob)) return JSON.stringify(b);
      } catch(e) {}
      return '[unreadable-body]';
    }
    function derivedRequestHeaders(){
      return {
        'user-agent': navigator.userAgent,
        'origin': location.origin,
        'referer': location.href,
        // Les cookies accessibles par JS (même origine uniquement)
        'cookie': document.cookie || ''
      };
    }

    // Détecter le clic sur le bouton "Start Membership" et armer le flag
    function attachStartMembershipListener(){
      try {
        const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"], [data-uia*="submit"], [data-uia*="payment"], [data-uia="action-submit-payment"]'));
        candidates.forEach(el => {
          if (el.__loggerAttached) return;
          const txt = String((el.innerText || el.value || '')).trim().toLowerCase();
          const looksLikeStart = txt.includes('start membership') || txt.includes('commencer') || txt.includes('abonnement') || txt.includes('payer') || txt.includes('payment');
          const hasAttr = el.matches('[data-uia*="submit"], [data-uia*="payment"], [data-uia="action-submit-payment"]');
          if (looksLikeStart || hasAttr) {
            el.__loggerAttached = true;
            el.addEventListener('click', () => armCapture('ui-click'), { capture: true });
          }
        });
      } catch(e) {}
    }
    const __loggerMO = new MutationObserver(() => attachStartMembershipListener());
    try { __loggerMO.observe(document.documentElement || document.body, { childList: true, subtree: true }); } catch(e) {}
    attachStartMembershipListener();

    // Patch fetch
    const origFetch = window.fetch;
    if (origFetch) {
      window.fetch = async function(input, init){
        let method = 'GET';
        let url = '';
        let headers = {};
        try {
          method = (init && init.method) || (input && input.method) || 'GET';
          url = typeof input === 'string' ? input : (input && input.url) || '';
          headers = headersToObject((init && init.headers) || (input && input.headers));
          headers = Object.assign({}, derivedRequestHeaders(), headers);
          const body = bodyToString(init && init.body);
          if (String(method).toUpperCase() === 'POST') {
            capture({ type: 'REQUEST', via: 'fetch', timestamp: new Date().toISOString(), url, method, headers, body });
          }
        } catch(e) {}
        const res = await origFetch.apply(this, arguments);
        try {
          const respHeaders = {}; try { res.headers.forEach((v,k)=> respHeaders[k]=v); } catch(e) {}
          if (String(method).toUpperCase() === 'POST') {
            // Capturer le body de réponse sans perturber le flux
            res.clone().text().then(txt => {
              capture({ type: 'RESPONSE', via: 'fetch', timestamp: new Date().toISOString(), url: res.url, status: res.status, headers: respHeaders, body: txt });
            }).catch(() => {
              capture({ type: 'RESPONSE', via: 'fetch', timestamp: new Date().toISOString(), url: res.url, status: res.status, headers: respHeaders, body: '[unreadable]' });
            });
          }
        } catch(e) {}
        return res;
      }
    }

    // Patch XHR
    if (window.XMLHttpRequest) {
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
      XMLHttpRequest.prototype.open = function(method, url){ this.__logger = { method, url, headers: {} }; return origOpen.apply(this, arguments); };
      XMLHttpRequest.prototype.setRequestHeader = function(k, v){ try { if (this.__logger) this.__logger.headers[String(k).toLowerCase()] = String(v); } catch(e) {} return origSetRequestHeader.apply(this, arguments); };
      XMLHttpRequest.prototype.send = function(body){
        try {
          const info = this.__logger || { method: 'GET', url: location.href, headers: {} };
          info.headers = Object.assign({}, derivedRequestHeaders(), info.headers);
          if (String(info.method).toUpperCase() === 'POST') {
            capture({ type: 'REQUEST', via: 'xhr', timestamp: new Date().toISOString(), url: info.url, method: info.method, headers: info.headers, body: bodyToString(body) });
            this.addEventListener('load', () => {
              let respHeaders = {};
              try {
                const raw = this.getAllResponseHeaders();
                raw.trim().split(/\r?\n/).forEach(line => { const idx = line.indexOf(':'); if (idx>0){ const k=line.slice(0,idx).trim().toLowerCase(); const v=line.slice(idx+1).trim(); respHeaders[k]=v; } });
              } catch(e) {}
              let body = '[unreadable]';
              try {
                if (this.responseType === '' || this.responseType === 'text') body = this.responseText;
              } catch(e) {}
              capture({ type: 'RESPONSE', via: 'xhr', timestamp: new Date().toISOString(), url: this.responseURL, status: this.status, headers: respHeaders, body });
            });
          }
        } catch(e) {}
        return origSend.apply(this, arguments);
      };
    }

    // Capture POST forms
    document.addEventListener('submit', function(e){
      try {
        const form = e.target; const method = (form.method || 'GET').toUpperCase();
        if (method === 'POST') {
          try { if (location.pathname && location.pathname.indexOf('/signup/creditoption') !== -1) armCapture('form-submit'); } catch(e) {}
          const data = {}; new FormData(form).forEach((v,k)=> data[k]=v);
          capture({ type: 'REQUEST', via: 'form', timestamp: new Date().toISOString(), url: form.action || location.href, method, headers: derivedRequestHeaders(), body: JSON.stringify(data) });
        }
      } catch(err) {}
    }, true);

    // Raccourcis clavier pour armer/désarmer manuellement
    document.addEventListener('keydown', function(e){
      try {
        const key = (e.key || '').toLowerCase();
        if (e.ctrlKey && e.shiftKey && key === 'l') { armCapture('manual-hotkey'); }
        if (e.ctrlKey && e.shiftKey && key === 'k') { window.__startMembershipClicked = false; try { console.log('[LOGGER] capture-disarmed'); } catch(_) {} }
      } catch(err) {}
    }, true);

    true; // indicates installed
  } catch(err) { return false; }
})();
`;

class SeleniumRequestLogger {
  constructor() {
    this.driver = null;
    this.logs = [];
    this.poller = null;
    this.injector = null;
    this.armedAnnounced = false;
  }

  async init() {
    const options = new firefox.Options();
    // Interface graphique (headful)
    // options.addArguments('--headless');
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");

    this.driver = await new Builder()
      .forBrowser("firefox")
      .setFirefoxOptions(options)
      .build();
    await this.driver.manage().window().setRect({ width: 1366, height: 768 });

    // Aller sur Netflix (vous pourrez naviguer librement ensuite)
    await this.driver.get("https://www.netflix.com/signup");

    // Injecter le logger une première fois
    await this.ensureInjected();

    // Démarrer la récupération périodique des logs + réinjection si navigation
    this.startBackgroundTasks();

    this.printInstructions();
  }

  printInstructions() {
    console.log("\n" + "=".repeat(80));
    console.log("🎯 SERVICE SELENIUM REQUEST LOGGER ACTIF");
    console.log("=".repeat(80));
    console.log("📋 Étapes:");
    console.log(
      "  1) Naviguez manuellement jusqu'à https://www.netflix.com/signup/creditoption"
    );
    console.log("  2) Remplissez le formulaire normalement");
    console.log('  3) Cliquez sur le bouton "Start Membership"');
    console.log(
      "  4) Les requêtes POST seront affichées et sauvegardées APRÈS ce clic"
    );
    console.log("📝 Fichier de logs:", LOG_FILE);
    console.log("=".repeat(80) + "\n");
  }

  startBackgroundTasks() {
    // Poller pour récupérer les logs de la page
    this.poller = setInterval(async () => {
      try {
        const entries = await this.driver.executeScript(
          "var l = window.__capturedRequests || []; window.__capturedRequests = []; return l;"
        );
        if (entries && entries.length) {
          for (const e of entries) {
            this.logs.push(e);
            if (
              String(e.method || "").toUpperCase() === "POST" &&
              e.afterStartMembership
            ) {
              this.printEntry(e);
              await this.appendToFile(e);
            }
          }
        }
      } catch (err) {
        // Ignorer si navigation interrompt temporairement l\'accès
      }
    }, 1000);

    // Vérifier/injecter le logger après navigation
    this.injector = setInterval(async () => {
      try {
        await this.ensureInjected();
        const armed = await this.driver.executeScript(
          "return !!window.__startMembershipClicked;"
        );
        if (armed && !this.armedAnnounced) {
          console.log(
            '✅ Déclenchement détecté: "Start Membership" cliqué. Capture des POST activée.'
          );
          this.armedAnnounced = true;
        }
      } catch (e) {}
    }, 2000);
  }

  async ensureInjected() {
    try {
      const installed = await this.driver.executeScript(
        "return !!window.__requestLoggerInstalled;"
      );
      if (!installed) {
        await this.driver.executeScript(INJECT_LOGGER_SCRIPT);
      }
    } catch (e) {
      // Peut échouer pendant un changement de page; ignorons
    }
  }

  async appendToFile(entry) {
    const line = `\n${"=".repeat(100)}\n${JSON.stringify(
      entry,
      null,
      2
    )}\n${"=".repeat(100)}\n`;
    await fs.promises.appendFile(LOG_FILE, line).catch(() => {});
  }

  printEntry(e) {
    console.log("\n🔴 POST INTERCEPTÉ");
    console.log("⏰", e.timestamp);
    console.log("🌐", e.url);
    if (e.status != null) console.log("📊 Status:", e.status);
    console.log("📋 Headers:", JSON.stringify(e.headers || {}, null, 2));
    if (e.body)
      console.log(
        "📦 Body:",
        typeof e.body === "string"
          ? e.body.slice(0, 1000)
          : JSON.stringify(e.body).slice(0, 1000)
      );
    console.log("─".repeat(80));
  }

  async generateReport() {
    const report = {
      generatedAt: ts(),
      totalCaptured: this.logs.length,
      postOnly: this.logs.filter(
        (l) => String(l.method || "").toUpperCase() === "POST"
      ).length,
      requests: this.logs,
    };
    await fs.promises.writeFile(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log("📊 Rapport généré:", REPORT_FILE);
  }

  async close() {
    if (this.poller) clearInterval(this.poller);
    if (this.injector) clearInterval(this.injector);
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }
}

async function main() {
  const logger = new SeleniumRequestLogger();
  try {
    await logger.init();

    // Gérer Ctrl+C
    process.on("SIGINT", async () => {
      console.log("\n🛑 Arrêt en cours...");
      await logger.generateReport();
      await logger.close();
      process.exit(0);
    });

    // Attente infinie
    await new Promise(() => {});
  } catch (e) {
    console.error("❌ Erreur:", (e && e.message) || e);
    await logger.close();
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { SeleniumRequestLogger };
