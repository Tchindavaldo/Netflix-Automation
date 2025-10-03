/**
 * Gestionnaire de sessions Netflix permettant de gérer plusieurs sessions en parallèle.
 * Chaque session contient un driver Selenium, des cookies et des métadonnées.
 */
class NetflixSessionManager {
  constructor() {
    // Map<sessionId, {driver, cookies, isActive, lastActivity, metadata}>
    this.sessions = new Map();

    // 30 minutes d'inactivité avant nettoyage automatique
    this.maxInactiveTime = 30 * 60 * 1000;

    // Nettoyage des sessions inactives toutes les 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupInactiveSessions().catch((error) => {
          console.error(
            "Erreur lors du nettoyage des sessions inactives:",
            error,
          );
        });
      },
      5 * 60 * 1000,
    );

    // Gestion propre de l'arrêt du processus
    process.on("SIGINT", async () => {
      console.log("\nArrêt du gestionnaire de sessions...");
      await this.shutdown();
      process.exit(0);
    });

    console.log("✅ Gestionnaire de sessions Netflix initialisé");
  }

  /**
   * Crée une nouvelle session Netflix
   * @param {Object} [metadata] - Métadonnées optionnelles pour la session
   * @returns {Promise<string>} L'ID de la nouvelle session
   * @throws {Error} Si la création de la session échoue
   */
  async createSession(metadata = {}) {
    try {
      console.log(`🔄 Création d'une nouvelle session Netflix...`);
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Stocker la session avec ses métadonnées
      this.sessions.set(sessionId, {
        driver: null,
        cookies: {
          cookieString: "",
          individual: {},
          raw: [],
          lastUpdated: null,
        },
        isActive: false,
        lastActivity: new Date(),
        metadata: {
          createdAt: new Date(),
          ...metadata,
        },
      });

      console.log(`✅ Session créée avec succès (ID: ${sessionId})`);
      return sessionId;
    } catch (error) {
      console.error("❌ Échec de la création de la session:", error);
      throw new Error(
        `Impossible de créer une nouvelle session: ${error.message}`,
      );
    }
  }

  /**
   * Récupère une session existante
   * @param {string} sessionId - L'ID de la session
   * @param {boolean} [updateActivity=true] - Mettre à jour le timestamp de dernière activité
   * @returns {Object|null} L'objet session ou null si non trouvé
   * @throws {Error} Si l'ID de session est invalide
   */
  getSession(sessionId, updateActivity = true) {
    if (!sessionId || typeof sessionId !== "string") {
      throw new Error("ID de session invalide");
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(
        `⚠️ Tentative d'accès à une session inexistante: ${sessionId}`,
      );
      return null;
    }

    // Mettre à jour le timestamp de dernière activité si demandé
    if (updateActivity) {
      session.lastActivity = new Date();
    }

    return session;
  }

  /**
   * Récupère toutes les sessions actives
   * @returns {Array<Object>} Liste des sessions avec leurs informations
   */
  getAllSessions() {
    const sessions = [];
    for (const [sessionId, session] of this.sessions.entries()) {
      sessions.push({
        sessionId,
        isActive: session.isActive,
        hasDriver: !!session.driver,
        hasCookies: Object.keys(session.cookies.individual || {}).length > 0,
        lastActivity: session.lastActivity,
        createdAt: session.metadata.createdAt,
      });
    }
    return sessions;
  }

  /**
   * Ferme une session spécifique et nettoie les ressources associées
   * @param {string} sessionId - L'ID de la session à fermer
   * @param {Object} [options] - Options de fermeture
   * @param {boolean} [options.force=false] - Forcer la fermeture même en cas d'erreur
   * @returns {Promise<boolean>} true si la session a été fermée avec succès, false sinon
   */
  async closeSession(sessionId, { force = false } = {}) {
    if (!sessionId || typeof sessionId !== "string") {
      console.error("❌ Impossible de fermer la session: ID invalide");
      return false;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(
        `⚠️ Tentative de fermeture d'une session inexistante: ${sessionId}`,
      );
      return false;
    }

    console.log(`🛑 Fermeture de la session ${sessionId}...`);

    try {
      // Le driver sera fermé par le service qui l'utilise (browserService)
      // Ici on nettoie juste la session du manager
      session.isActive = false;
      session.driver = null;
      session.cookies = {
        cookieString: "",
        individual: {},
        raw: [],
        lastUpdated: null,
      };

      console.log(`✅ Session ${sessionId} nettoyée avec succès`);
      return true;
    } catch (error) {
      const errorMsg = `Erreur lors du nettoyage de la session ${sessionId}: ${error.message}`;

      if (force) {
        console.warn(`⚠️ ${errorMsg} (fermeture forcée)`);
      } else {
        console.error(`❌ ${errorMsg}`);
        return false;
      }
    } finally {
      // Toujours supprimer la session de la Map
      this.sessions.delete(sessionId);

      if (this.sessions.size === 0) {
        console.log("ℹ️ Aucune session active restante");
      }
    }

    return true;
  }

  /**
   * Nettoie les sessions inactives en fonction du temps d'inactivité
   * @returns {Promise<{total: number, closed: number, errors: number}>} Statistiques de nettoyage
   */
  async cleanupInactiveSessions() {
    const now = new Date();
    const inactiveSessions = [];
    const stats = { total: 0, closed: 0, errors: 0 };

    try {
      // Identifier les sessions inactives
      for (const [sessionId, session] of this.sessions.entries()) {
        stats.total++;
        const inactiveTime = now - session.lastActivity;

        if (inactiveTime > this.maxInactiveTime) {
          console.log(
            `ℹ️ Session inactive détectée: ${sessionId} (${Math.floor(inactiveTime / 1000)}s)`,
          );
          inactiveSessions.push(sessionId);
        }
      }

      // Fermer les sessions inactives
      if (inactiveSessions.length > 0) {
        console.log(
          `🧹 Nettoyage de ${inactiveSessions.length} session(s) inactive(s)...`,
        );

        const results = await Promise.allSettled(
          inactiveSessions.map((sessionId) =>
            this.closeSession(sessionId, { force: true })
              .then((success) => ({ sessionId, success }))
              .catch((error) => ({ sessionId, success: false, error })),
          ),
        );

        // Analyser les résultats
        for (const result of results) {
          if (result.status === "fulfilled") {
            if (result.value.success) {
              stats.closed++;
            } else {
              stats.errors++;
              console.error(
                `❌ Échec de la fermeture de la session ${result.value.sessionId}:`,
                result.value.error?.message || "Inconnu",
              );
            }
          } else {
            stats.errors++;
            console.error(
              `❌ Erreur lors du nettoyage d'une session:`,
              result.reason,
            );
          }
        }

        console.log(
          `✅ Nettoyage terminé: ${stats.closed} session(s) fermée(s), ${stats.errors} erreur(s)`,
        );
      } else if (stats.total > 0) {
        console.log(
          `ℹ️ Aucune session inactive à nettoyer (${stats.total} session(s) active(s))`,
        );
      } else {
        console.log("ℹ️ Aucune session à nettoyer");
      }

      return stats;
    } catch (error) {
      console.error(
        "❌ Erreur critique lors du nettoyage des sessions inactives:",
        error,
      );
      throw error;
    }
  }

  /**
   * Arrête le gestionnaire de sessions et nettoie toutes les ressources
   * @param {Object} [options] - Options d'arrêt
   * @param {boolean} [options.force=false] - Forcer l'arrêt même en cas d'erreur
   * @returns {Promise<boolean>} true si l'arrêt s'est bien déroulé, false sinon
   */
  async shutdown({ force = false } = {}) {
    console.log("\n🛑 Arrêt du gestionnaire de sessions...");

    try {
      // Arrêter l'intervalle de nettoyage
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      // Fermer toutes les sessions actives
      const sessions = Array.from(this.sessions.keys());
      const sessionCount = sessions.length;

      if (sessionCount > 0) {
        console.log(`ℹ️ Fermeture de ${sessionCount} session(s) active(s)...`);

        const results = await Promise.allSettled(
          sessions.map((sessionId) =>
            this.closeSession(sessionId, { force })
              .then((success) => ({ sessionId, success }))
              .catch((error) => ({ sessionId, success: false, error })),
          ),
        );

        // Vérifier les erreurs
        const errors = results.filter(
          (r) =>
            r.status === "rejected" ||
            (r.status === "fulfilled" && !r.value.success),
        );

        if (errors.length > 0) {
          console.warn(
            `⚠️ ${errors.length} erreur(s) lors de la fermeture des sessions`,
          );
          if (!force) {
            throw new Error(
              `Impossible de fermer toutes les sessions (${errors.length} erreur(s))`,
            );
          }
        }

        console.log(
          `✅ Toutes les sessions ont été fermées (${sessionCount} session(s))`,
        );
      } else {
        console.log("ℹ️ Aucune session active à fermer");
      }

      console.log("✅ Gestionnaire de sessions arrêté avec succès");
      return true;
    } catch (error) {
      const errorMsg = `Erreur lors de l'arrêt du gestionnaire de sessions: ${error.message}`;
      if (force) {
        console.warn(`⚠️ ${errorMsg} (arrêt forcé)`);
        return true;
      } else {
        console.error(`❌ ${errorMsg}`);
        return false;
      }
    }
  }

  /**
   * Retourne une instance singleton du gestionnaire
   * @returns {NetflixSessionManager}
   */
  static getInstance() {
    if (!NetflixSessionManager.instance) {
      NetflixSessionManager.instance = new NetflixSessionManager();
    }
    return NetflixSessionManager.instance;
  }
}

// Instance singleton
NetflixSessionManager.instance = null;

// Exporte la classe et le singleton
module.exports = { NetflixSessionManager };
