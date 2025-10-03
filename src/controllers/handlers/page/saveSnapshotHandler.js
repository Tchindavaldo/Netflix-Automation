const pageSnapshotService = require("../../../services/netflix/page/pageSnapshotService");

/**
 * Gestionnaire pour sauvegarder un snapshot complet de la page
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const saveSnapshotHandler = async (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.headers["x-session-id"];

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message:
          "ID de session requis. Démarrez d'abord une session avec /api/netflix/session/start",
      });
    }

    // Options de sauvegarde depuis la requête
    const options = {
      prefix: req.body.prefix || req.query.prefix || "snapshot",
      directory: req.body.directory || req.query.directory || undefined,
    };

    const result = await pageSnapshotService.savePageSnapshot(sessionId, options);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.status(200).json({
      success: true,
      sessionId,
      files: result.files,
      metadata: result.metadata,
      message: "Snapshot sauvegardé avec succès",
    });
  } catch (error) {
    console.error("Erreur dans le gestionnaire saveSnapshot:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la sauvegarde du snapshot",
      error: error.toString(),
    });
  }
};

module.exports = saveSnapshotHandler;
