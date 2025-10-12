const { v4: uuidv4 } = require('uuid');
const { bucket } = require('../config/firebase');
const fs = require('fs').promises;
const path = require('path');

/**
 * Service pour uploader n'importe quel type de fichier vers Firebase Storage
 */
class FileUploadService {
  /**
   * Uploader un fichier vers Firebase Storage
   * @param {Object} options - Options d'upload
   * @param {string} options.localFilePath - Chemin local du fichier
   * @param {string} options.userId - ID de l'utilisateur
   * @param {string} options.folderName - Nom du dossier (date ou autre)
   * @param {string} options.fileName - Nom du fichier
   * @param {string} options.contentType - Type MIME du fichier
   * @returns {Promise<string>} - URL publique du fichier uploadé
   */
  static async uploadFile({ localFilePath, userId, folderName, fileName, contentType }) {
    try {
      // Lire le fichier local
      const fileBuffer = await fs.readFile(localFilePath);

      // Construire le chemin dans Firebase Storage: userId/date/fileName
      const storagePath = `subscription-errors/${userId}/${folderName}/${fileName}`;
      const fileRef = bucket.file(storagePath);

      // Uploader le fichier
      await fileRef.save(fileBuffer, {
        metadata: {
          contentType: contentType,
        },
      });

      // Rendre le fichier public
      await fileRef.makePublic();

      // Récupérer l'URL publique
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      
      console.log(`✅ Fichier uploadé: ${fileName}`);
      
      return publicUrl;

    } catch (error) {
      console.error(`❌ Erreur lors de l'upload de ${fileName}:`, error.message);
      throw new Error(`Erreur upload: ${error.message}`);
    }
  }

  /**
   * Uploader plusieurs fichiers d'un snapshot
   * @param {Object} snapshotData - Données du snapshot
   * @param {string} snapshotData.htmlPath - Chemin du fichier HTML
   * @param {string} snapshotData.screenshotPath - Chemin du screenshot
   * @param {string} snapshotData.metadataPath - Chemin du fichier JSON
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} - URLs des fichiers uploadés
   */
  static async uploadSnapshot(snapshotData, userId) {
    try {
      const folderName = new Date().toISOString().replace(/[:.]/g, '-');
      const uploadResults = {};

      // Upload HTML si présent
      if (snapshotData.htmlPath) {
        uploadResults.htmlUrl = await this.uploadFile({
          localFilePath: snapshotData.htmlPath,
          userId,
          folderName,
          fileName: path.basename(snapshotData.htmlPath),
          contentType: 'text/html'
        });
      }

      // Upload screenshot si présent
      if (snapshotData.screenshotPath) {
        uploadResults.screenshotUrl = await this.uploadFile({
          localFilePath: snapshotData.screenshotPath,
          userId,
          folderName,
          fileName: path.basename(snapshotData.screenshotPath),
          contentType: 'image/png'
        });
      }

      // Upload metadata JSON si présent
      if (snapshotData.metadataPath) {
        uploadResults.metadataUrl = await this.uploadFile({
          localFilePath: snapshotData.metadataPath,
          userId,
          folderName,
          fileName: path.basename(snapshotData.metadataPath),
          contentType: 'application/json'
        });
      }

      console.log(`✅ Tous les fichiers du snapshot uploadés pour ${userId}`);
      
      return {
        success: true,
        folderName,
        urls: uploadResults
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'upload du snapshot:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Supprimer un fichier local après upload réussi
   * @param {string} filePath - Chemin du fichier à supprimer
   * @returns {Promise<boolean>} - true si supprimé avec succès
   */
  static async deleteLocalFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ Fichier local supprimé: ${path.basename(filePath)}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression de ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Supprimer plusieurs fichiers locaux
   * @param {Array<string>} filePaths - Tableau de chemins de fichiers
   * @returns {Promise<void>}
   */
  static async deleteLocalFiles(filePaths) {
    const deletePromises = filePaths
      .filter(filePath => filePath) // Filtrer les valeurs nulles/undefined
      .map(filePath => this.deleteLocalFile(filePath));
    
    await Promise.all(deletePromises);
  }
}

module.exports = FileUploadService;
