const fs = require("fs");
const path = require("path");
const { NetflixSessionManager } = require("../NetflixSessionManager");

class PageSnapshotService {
  constructor() {
    this.sessionManager = NetflixSessionManager.getInstance();
    this.snapshotsDir = path.join(process.cwd(), "snapshots");
    this.ensureSnapshotsDirectory();
  }

  /**
   * S'assure que le dossier snapshots existe
   */
  ensureSnapshotsDirectory() {
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true });
    }
  }

  /**
   * Sauvegarde un snapshot complet de la page (HTML + screenshot + métadonnées)
   * @param {string} sessionId - ID de la session
   * @param {Object} options - Options de sauvegarde
   * @returns {Promise<Object>} Résultat avec les chemins des fichiers
   */
  async savePageSnapshot(sessionId, options = {}) {
    try {
      const session = this.sessionManager.getSession(sessionId);
      if (!session || !session.driver) {
        throw new Error("Session non valide ou expirée");
      }

      const timestamp = Date.now();
      const prefix = options.prefix || "snapshot";
      
      // Gérer le sous-dossier si un folderName est fourni
      let customDir = options.directory || this.snapshotsDir;
      let folderName = null;
      
      if (options.folderName) {
        folderName = options.folderName;
        customDir = path.join(this.snapshotsDir, folderName);
      }

      // Créer le dossier si nécessaire
      if (!fs.existsSync(customDir)) {
        fs.mkdirSync(customDir, { recursive: true });
      }

      // Récupérer les informations de la page
      let readyState = "";
      let userAgent = "";
      let title = "";
      let currentUrl = "";

      try {
        readyState = await session.driver.executeScript(
          "return document.readyState;",
        );
      } catch (e) {}
      try {
        userAgent = await session.driver.executeScript(
          "return navigator.userAgent;",
        );
      } catch (e) {}
      try {
        title = await session.driver.getTitle();
      } catch (e) {}
      try {
        currentUrl = await session.driver.getCurrentUrl();
      } catch (e) {}

      // Récupérer le HTML
      const html = await session.driver.getPageSource();
      const htmlPath = path.join(customDir, `${prefix}_${timestamp}.html`);
      fs.writeFileSync(htmlPath, html);

      // Prendre un screenshot
      const screenshot = await session.driver.takeScreenshot();
      const screenshotPath = path.join(
        customDir,
        `${prefix}_${timestamp}.png`,
      );
      fs.writeFileSync(screenshotPath, screenshot, "base64");

      // Créer un fichier de métadonnées
      const metadata = {
        timestamp: new Date().toISOString(),
        sessionId,
        url: currentUrl,
        title,
        readyState,
        userAgent,
        htmlLength: html.length,
        files: {
          html: path.basename(htmlPath),
          screenshot: path.basename(screenshotPath),
        },
      };

      const metadataPath = path.join(
        customDir,
        `${prefix}_${timestamp}.json`,
      );
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      // console.log(
      //   `📸 Snapshot sauvegardé: ${metadata.files.html}, ${metadata.files.screenshot}`,
      // );

      return {
        success: true,
        folderName: folderName, // Retourner le nom du sous-dossier utilisé
        files: {
          html: htmlPath,
          screenshot: screenshotPath,
          metadata: metadataPath,
        },
        metadata,
      };
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde du snapshot:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Sauvegarde seulement le HTML de la page
   * @param {string} sessionId - ID de la session
   * @param {Object} options - Options de sauvegarde
   * @returns {Promise<Object>} Résultat avec le chemin du fichier
   */
  async savePageHTML(sessionId, options = {}) {
    try {
      const session = this.sessionManager.getSession(sessionId);
      if (!session || !session.driver) {
        throw new Error("Session non valide ou expirée");
      }

      const timestamp = Date.now();
      const prefix = options.prefix || "page";
      const customDir = options.directory || this.snapshotsDir;

      if (!fs.existsSync(customDir)) {
        fs.mkdirSync(customDir, { recursive: true });
      }

      const html = await session.driver.getPageSource();
      const htmlPath = path.join(customDir, `${prefix}_${timestamp}.html`);
      fs.writeFileSync(htmlPath, html);

      let currentUrl = "";
      try {
        currentUrl = await session.driver.getCurrentUrl();
      } catch (e) {}

      // console.log(`📄 HTML sauvegardé: ${path.basename(htmlPath)}`);

      return {
        success: true,
        path: htmlPath,
        url: currentUrl,
        size: html.length,
      };
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde du HTML:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Prend un screenshot de la page
   * @param {string} sessionId - ID de la session
   * @param {Object} options - Options de screenshot
   * @returns {Promise<Object>} Résultat avec le chemin et/ou base64
   */
  async takeScreenshot(sessionId, options = {}) {
    try {
      const session = this.sessionManager.getSession(sessionId);
      if (!session || !session.driver) {
        throw new Error("Session non valide ou expirée");
      }

      const screenshot = await session.driver.takeScreenshot();
      let filePath = null;

      if (options.saveToDisk !== false) {
        const timestamp = Date.now();
        const prefix = options.prefix || "screenshot";
        const customDir = options.directory || this.snapshotsDir;

        if (!fs.existsSync(customDir)) {
          fs.mkdirSync(customDir, { recursive: true });
        }

        filePath = path.join(customDir, `${prefix}_${timestamp}.png`);
        fs.writeFileSync(filePath, screenshot, "base64");
        // console.log(`📸 Screenshot sauvegardé: ${path.basename(filePath)}`);
      }

      return {
        success: true,
        base64: screenshot,
        path: filePath,
      };
    } catch (error) {
      console.error("❌ Erreur lors du screenshot:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Liste tous les snapshots sauvegardés
   * @returns {Object} Liste des snapshots
   */
  listSnapshots() {
    try {
      if (!fs.existsSync(this.snapshotsDir)) {
        return {
          success: true,
          snapshots: [],
        };
      }

      const files = fs.readdirSync(this.snapshotsDir);
      const snapshots = files
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          try {
            const content = fs.readFileSync(
              path.join(this.snapshotsDir, f),
              "utf-8",
            );
            return JSON.parse(content);
          } catch (e) {
            return null;
          }
        })
        .filter((s) => s !== null)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return {
        success: true,
        count: snapshots.length,
        snapshots,
      };
    } catch (error) {
      console.error("❌ Erreur lors de la liste des snapshots:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

// Exporte une instance singleton du service
module.exports = new PageSnapshotService();
