const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

/**
 * Gestionnaire pour télécharger les fichiers d'un sous-dossier de snapshots
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const downloadSnapshotHandler = async (req, res) => {
  try {
    // Accepter folderName depuis URL params, query params ou body
    const folderName = req.params.folderName || req.query.folderName || req.query.folder_name || req.body.folderName;

    if (!folderName) {
      return res.status(400).json({
        success: false,
        message: "Le nom du dossier est requis (folderName)",
      });
    }

    // Construire le chemin du dossier
    const snapshotsDir = path.join(process.cwd(), "snapshots");
    const targetDir = path.join(snapshotsDir, folderName);

    // Vérifier que le dossier existe
    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({
        success: false,
        message: `Le dossier '${folderName}' n'existe pas`,
      });
    }

    // Vérifier que c'est bien un dossier
    const stats = fs.statSync(targetDir);
    if (!stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        message: `'${folderName}' n'est pas un dossier valide`,
      });
    }

    // Lire les fichiers du dossier
    const files = fs.readdirSync(targetDir);

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Le dossier '${folderName}' est vide`,
      });
    }

    // console.log(`📦 Préparation du téléchargement du dossier: ${folderName}`);
    // console.log(`📁 Fichiers trouvés: ${files.length}`);

    // Configurer les headers pour le téléchargement
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${folderName}_snapshots.zip"`
    );

    // Créer une archive ZIP
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Niveau de compression maximum
    });

    // Gérer les erreurs de l'archive
    archive.on("error", (err) => {
      console.error("❌ Erreur lors de la création de l'archive:", err);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la création de l'archive",
        error: err.message,
      });
    });

    // Envoyer l'archive au client
    archive.pipe(res);

    // Ajouter tous les fichiers du dossier à l'archive
    files.forEach((file) => {
      const filePath = path.join(targetDir, file);
      const fileStats = fs.statSync(filePath);

      if (fileStats.isFile()) {
        archive.file(filePath, { name: file });
        // console.log(`  ✅ Ajouté: ${file}`);
      }
    });

    // Finaliser l'archive
    await archive.finalize();

    // console.log(`✅ Téléchargement du dossier '${folderName}' terminé`);
  } catch (error) {
    console.error("❌ Erreur dans le gestionnaire downloadSnapshot:", error);
    
    // Si les headers n'ont pas encore été envoyés
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || "Erreur lors du téléchargement",
        error: error.toString(),
      });
    }
  }
};

module.exports = downloadSnapshotHandler;
