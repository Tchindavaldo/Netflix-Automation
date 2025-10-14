const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

/**
 * Service pour uploader des fichiers vers Google Drive
 * Utilise OAuth2 user credentials pour l'authentification
 */
class GoogleDriveUploadService {
  constructor() {
    // Initialiser l'authentification OAuth2 avec user credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      'http://localhost' // redirect_uri (pas utilisé ici, juste pour la config)
    );

    // Définir le refresh token pour obtenir automatiquement les access tokens
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN
    });

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // ID du dossier partagé 'netflix-api-automation-error'
    this.rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1AY8yJ2C0w3nMsn2-LV455lnXHdJeSbwJ';
    
    console.log('✅ Google Drive OAuth2 initialisé');
  }

  /**
   * Récupérer le dossier racine partagé "netflix-api-automation-error"
   * @returns {Promise<string>} - ID du dossier racine
   */
  async getRootFolder() {
    // Utiliser directement l'ID du dossier partagé
    console.log(`✅ Utilisation du dossier partagé: ${this.rootFolderId}`);
    return this.rootFolderId;
  }

  /**
   * Créer un dossier pour l'utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {string} parentFolderId - ID du dossier parent
   * @returns {Promise<string>} - ID du dossier utilisateur
   */
  async createUserFolder(userId, parentFolderId) {
    try {
      const folderName = `userId_${userId}`;
      
      console.log(`🔍 Recherche du dossier utilisateur: ${folderName}...`);
      
      // Chercher si le dossier existe déjà
      const response = await this.drive.files.list({
        q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      console.log(`📊 Résultats de recherche: ${response.data.files.length} dossier(s) trouvé(s)`);

      if (response.data.files.length > 0) {
        console.log(`✅ Dossier utilisateur existant: userId_${userId}`);
        return response.data.files[0].id;
      }

      console.log(`📝 Création du dossier utilisateur: ${folderName}...`);
      
      // Créer le dossier utilisateur
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      };

      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });

      console.log(`✅ Dossier utilisateur créé: userId_${userId}`);
      return folder.data.id;
    } catch (error) {
      console.error('❌ Erreur lors de la création du dossier utilisateur:', error.message);
      console.error(`   Code erreur: ${error.code}`);
      console.error(`   Stack: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Créer un dossier pour la date
   * @param {string} parentFolderId - ID du dossier parent
   * @returns {Promise<string>} - ID du dossier date
   */
  async createDateFolder(parentFolderId) {
    try {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const folderName = `date_${dateString}`;
      
      // Chercher si le dossier existe déjà
      const response = await this.drive.files.list({
        q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (response.data.files.length > 0) {
        console.log(`✅ Dossier date existant: ${folderName}`);
        return response.data.files[0].id;
      }

      // Créer le dossier date
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      };

      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });

      console.log(`✅ Dossier date créé: ${folderName}`);
      return folder.data.id;
    } catch (error) {
      console.error('Erreur lors de la création du dossier date:', error.message);
      throw error;
    }
  }

  /**
   * Créer un dossier pour le planActivationId
   * @param {string} planActivationId - ID du plan d'activation
   * @param {string} parentFolderId - ID du dossier parent
   * @returns {Promise<string>} - ID du dossier planActivation
   */
  async createPlanActivationFolder(planActivationId, parentFolderId) {
    try {
      const folderName = `planActivationId_${planActivationId}`;
      
      // Chercher si le dossier existe déjà
      const response = await this.drive.files.list({
        q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (response.data.files.length > 0) {
        console.log(`✅ Dossier planActivation existant: planActivationId_${planActivationId}`);
        return response.data.files[0].id;
      }

      // Créer le dossier planActivation
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      };

      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });

      console.log(`✅ Dossier planActivation créé: planActivationId_${planActivationId}`);
      return folder.data.id;
    } catch (error) {
      console.error('Erreur lors de la création du dossier planActivation:', error.message);
      throw error;
    }
  }

  /**
   * Uploader un fichier vers Google Drive
   * @param {string} localFilePath - Chemin local du fichier
   * @param {string} fileName - Nom du fichier
   * @param {string} mimeType - Type MIME du fichier
   * @param {string} folderId - ID du dossier de destination
   * @returns {Promise<Object>} - Informations du fichier uploadé
   */
  async uploadFile(localFilePath, fileName, mimeType, folderId) {
    try {
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType: mimeType,
        body: await fs.readFile(localFilePath).then(buffer => {
          const { Readable } = require('stream');
          const stream = new Readable();
          stream.push(buffer);
          stream.push(null);
          return stream;
        }),
      };

      const file = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      // Rendre le fichier accessible publiquement
      await this.drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      console.log(`✅ Fichier uploadé: ${fileName}`);

      return {
        id: file.data.id,
        webViewLink: file.data.webViewLink,
        webContentLink: file.data.webContentLink,
      };
    } catch (error) {
      console.error(`❌ Erreur lors de l'upload de ${fileName}:`, error.message);
      throw error;
    }
  }

  /**
   * Uploader un snapshot complet (HTML + screenshot + metadata)
   * @param {Object} snapshotData - Données du snapshot
   * @param {string} snapshotData.htmlPath - Chemin du fichier HTML
   * @param {string} snapshotData.screenshotPath - Chemin du screenshot
   * @param {string} snapshotData.metadataPath - Chemin du fichier JSON
   * @param {string} userId - ID de l'utilisateur
   * @param {string} planActivationId - ID du plan d'activation
   * @returns {Promise<Object>} - URLs des fichiers uploadés
   */
  async uploadSnapshot(snapshotData, userId, planActivationId) {
    try {
      console.log('📁 Préparation de l\'upload vers Google Drive...');
      console.log(`   userId: ${userId}`);
      console.log(`   planActivationId: ${planActivationId}`);

      // 1. Créer/récupérer le dossier racine
      const rootFolderId = await this.getRootFolder();

      // 2. Créer/récupérer le dossier utilisateur
      const userFolderId = await this.createUserFolder(userId, rootFolderId);

      // 3. Créer/récupérer le dossier date
      const dateFolderId = await this.createDateFolder(userFolderId);

      // 4. Créer/récupérer le dossier pour ce planActivationId
      const planActivationFolderId = await this.createPlanActivationFolder(planActivationId, dateFolderId);

      const uploadResults = {};
      const dateString = new Date().toISOString().split('T')[0];

      // 5. Upload HTML
      if (snapshotData.htmlPath) {
        const htmlFile = await this.uploadFile(
          snapshotData.htmlPath,
          path.basename(snapshotData.htmlPath),
          'text/html',
          planActivationFolderId
        );
        uploadResults.htmlUrl = htmlFile.webViewLink;
        uploadResults.htmlDownloadUrl = htmlFile.webContentLink;
      }

      // 6. Upload Screenshot
      if (snapshotData.screenshotPath) {
        const screenshotFile = await this.uploadFile(
          snapshotData.screenshotPath,
          path.basename(snapshotData.screenshotPath),
          'image/png',
          planActivationFolderId
        );
        uploadResults.screenshotUrl = screenshotFile.webViewLink;
        uploadResults.screenshotDownloadUrl = screenshotFile.webContentLink;
      }

      // 7. Upload Metadata
      if (snapshotData.metadataPath) {
        const metadataFile = await this.uploadFile(
          snapshotData.metadataPath,
          path.basename(snapshotData.metadataPath),
          'application/json',
          planActivationFolderId
        );
        uploadResults.metadataUrl = metadataFile.webViewLink;
        uploadResults.metadataDownloadUrl = metadataFile.webContentLink;
      }

      console.log(`✅ Tous les fichiers uploadés vers Google Drive`);
      console.log(`   Structure: netflix-api-automation-error/userId_${userId}/date_${dateString}/planActivationId_${planActivationId}/`);

      return {
        success: true,
        folderName: `planActivationId_${planActivationId}`,
        folderPath: `netflix-api-automation-error/userId_${userId}/date_${dateString}/planActivationId_${planActivationId}`,
        urls: uploadResults,
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'upload du snapshot vers Google Drive:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Supprimer un fichier local après upload réussi
   * @param {string} filePath - Chemin du fichier à supprimer
   * @returns {Promise<boolean>}
   */
  async deleteLocalFile(filePath) {
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
  async deleteLocalFiles(filePaths) {
    const deletePromises = filePaths
      .filter(filePath => filePath)
      .map(filePath => this.deleteLocalFile(filePath));

    await Promise.all(deletePromises);
  }
}

// Exporter une instance singleton
module.exports = new GoogleDriveUploadService();
