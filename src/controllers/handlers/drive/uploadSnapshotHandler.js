const GoogleDriveUploadService = require('../../../services/googleDriveUpload.service');
const fs = require('fs').promises;
const path = require('path');

/**
 * Gestionnaire pour uploader manuellement des snapshots vers Google Drive
 * Utile pour tester et déboguer l'upload séparément du workflow principal
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const uploadSnapshotHandler = async (req, res) => {
  try {
    const { userId, planActivationId, snapshotFiles } = req.body;

    // console.log('📤 Upload manuel vers Google Drive...');
    // console.log(`   userId: ${userId}`);
    // console.log(`   planActivationId: ${planActivationId}`);

    // Validation des paramètres
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre userId est obligatoire'
      });
    }

    if (!planActivationId) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre planActivationId est obligatoire'
      });
    }

    if (!snapshotFiles || !snapshotFiles.htmlPath) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre snapshotFiles.htmlPath est obligatoire'
      });
    }

    // Vérifier que les fichiers existent
    const filesToCheck = [
      snapshotFiles.htmlPath,
      snapshotFiles.screenshotPath,
      snapshotFiles.metadataPath
    ].filter(Boolean);

    for (const filePath of filesToCheck) {
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: `Fichier introuvable: ${filePath}`,
          error: error.message
        });
      }
    }

    // console.log('✅ Tous les fichiers existent localement');

    // Uploader vers Google Drive
    const uploadResult = await GoogleDriveUploadService.uploadSnapshot(
      snapshotFiles,
      userId,
      planActivationId
    );

    if (uploadResult.success) {
      // console.log('✅ Upload vers Google Drive réussi');
      
      // Optionnel : Supprimer les fichiers locaux après upload réussi
      if (req.body.deleteAfterUpload) {
        const localFiles = [
          snapshotFiles.htmlPath,
          snapshotFiles.screenshotPath,
          snapshotFiles.metadataPath
        ].filter(Boolean);

        await GoogleDriveUploadService.deleteLocalFiles(localFiles);
        // console.log('🗑️ Fichiers locaux supprimés après upload');
      }

      return res.status(200).json({
        success: true,
        message: 'Snapshots uploadés vers Google Drive avec succès',
        folderPath: uploadResult.folderPath,
        folderName: uploadResult.folderName,
        urls: uploadResult.urls
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Échec de l\'upload vers Google Drive',
        error: uploadResult.error
      });
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'upload manuel:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload vers Google Drive',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = uploadSnapshotHandler;
