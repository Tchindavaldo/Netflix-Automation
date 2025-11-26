const fs = require('fs').promises;
const path = require('path');

/**
 * Gestionnaire pour supprimer manuellement un dossier de snapshot local
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const deleteSnapshotHandler = async (req, res) => {
  try {
    const { folderName } = req.body;

    // console.log('🗑️ Demande de suppression du dossier de snapshot...');
    // console.log(`   Dossier: ${folderName}`);

    // Validation du paramètre
    if (!folderName) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre folderName est obligatoire'
      });
    }

    // Sécurité : vérifier que le folderName ne contient pas de caractères dangereux
    if (folderName.includes('..') || folderName.includes('/') || folderName.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Nom de dossier invalide (caractères interdits)'
      });
    }

    // Construire le chemin du dossier
    const snapshotsBaseDir = path.join(process.cwd(), 'snapshots');
    const folderPath = path.join(snapshotsBaseDir, folderName);

    // Vérifier que le dossier existe
    try {
      await fs.access(folderPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: `Dossier introuvable: ${folderName}`,
        path: folderPath
      });
    }

    // Supprimer le dossier et son contenu
    await fs.rm(folderPath, { recursive: true, force: true });

    // console.log(`✅ Dossier supprimé: ${folderName}`);

    return res.status(200).json({
      success: true,
      message: `Dossier de snapshot supprimé avec succès`,
      folderName: folderName,
      path: folderPath
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression du dossier:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression du dossier de snapshot',
      error: error.toString()
    });
  }
};

module.exports = deleteSnapshotHandler;
