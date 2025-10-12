const axios = require('axios');
const FileUploadService = require('../../fileUpload.service');
const path = require('path');
const fs = require('fs').promises;

/**
 * Helper pour gérer les retries et l'enregistrement des erreurs
 */
class RetryHelper {
  /**
   * Exécuter une fonction avec retry automatique et enregistrement d'erreur
   * @param {Function} fn - Fonction à exécuter (doit retourner une Promise)
   * @param {Object} options - Options de retry
   * @param {number} options.maxRetries - Nombre maximum de retries (défaut: 2)
   * @param {number} options.retryDelay - Délai entre chaque retry en ms (défaut: 5000)
   * @param {string} options.stepName - Nom de l'étape (pour les logs)
   * @param {Object} options.errorContext - Contexte à enregistrer en cas d'erreur finale (doit inclure userId, sessionId, planActivationId)
   * @param {string} options.baseUrl - URL de base de l'API pour enregistrer l'erreur
   * @returns {Promise<Object>} - Résultat de l'exécution
   */
  static async executeWithRetry(fn, options = {}) {
    const {
      maxRetries = 2,
      retryDelay = 5000,
      stepName = 'unknown',
      errorContext = {},
      baseUrl = 'http://localhost:3000'
    } = options;

    // Vérifier que userId est présent dans le contexte
    if (!errorContext.userId && !errorContext.planActivationId) {
      console.warn('⚠️ userId ou planActivationId manquant dans errorContext pour le retry');
    }

    let lastError = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        attempt++;
        
        if (attempt > 1) {
          console.log(`🔄 Tentative ${attempt}/${maxRetries + 1} pour ${stepName}...`);
        }

        const result = await fn();

        // Si la fonction réussit, retourner le résultat
        if (result.success) {
          if (attempt > 1) {
            console.log(`✅ ${stepName} réussi à la tentative ${attempt}`);
          }
          return result;
        }

        // Si la fonction retourne un échec
        lastError = result.error || 'Échec sans message d\'erreur';
        
        // Si ce n'est pas le dernier essai, attendre et réessayer
        if (attempt <= maxRetries) {
          console.log(`⏳ Échec de ${stepName}, attente de ${retryDelay / 1000}s avant nouvelle tentative...`);
          await this.sleep(retryDelay);
        }

      } catch (error) {
        lastError = error.message;
        
        // Si ce n'est pas le dernier essai, attendre et réessayer
        if (attempt <= maxRetries) {
          console.log(`⏳ Erreur lors de ${stepName}, attente de ${retryDelay / 1000}s avant nouvelle tentative...`);
          await this.sleep(retryDelay);
        }
      }
    }

    // Après tous les retries, enregistrer l'erreur en base
    console.error(`❌ Échec définitif de ${stepName} après ${maxRetries + 1} tentatives`);
    
    await this.logErrorToDatabase(baseUrl, {
      stepName,
      error: lastError,
      attempts: maxRetries + 1,
      ...errorContext
    });

    return {
      success: false,
      error: lastError,
      step: stepName,
      attempts: maxRetries + 1
    };
  }

  /**
   * Attendre un certain délai
   * @param {number} ms - Délai en millisecondes
   * @returns {Promise<void>}
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Capturer l'URL actuelle de la page
   * @param {string} baseUrl - URL de base de l'API
   * @param {string} sessionId - ID de la session
   * @returns {Promise<string|null>} - URL actuelle ou null
   */
  static async captureCurrentUrl(baseUrl, sessionId) {
    try {
      const response = await axios.post(`${baseUrl}/api/netflix/page/current`, { sessionId });
      return response.data?.currentUrl || response.data?.url || null;
    } catch (error) {
      console.error('❌ Impossible de récupérer l\'URL actuelle:', error.message);
      return null;
    }
  }

  /**
   * Capturer un snapshot de la page (HTML + screenshot + metadata)
   * @param {string} baseUrl - URL de base de l'API
   * @param {string} sessionId - ID de la session
   * @returns {Promise<Object|null>} - Données du snapshot ou null
   */
  static async captureSnapshot(baseUrl, sessionId) {
    try {
      console.log('📸 Capture du snapshot de la page...');
      
      const response = await axios.post(`${baseUrl}/api/netflix/page/snapshot`, { sessionId });
      
      if (response.data?.success && response.data?.files) {
        console.log('✅ Snapshot capturé avec succès');
        // La réponse retourne files.html, files.screenshot, files.metadata
        return {
          htmlPath: response.data.files.html,
          screenshotPath: response.data.files.screenshot,
          metadataPath: response.data.files.metadata
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Impossible de capturer le snapshot:', error.message);
      return null;
    }
  }

  /**
   * Enregistrer une erreur dans la base de données avec URL et snapshot
   * @param {string} baseUrl - URL de base de l'API
   * @param {Object} errorData - Données de l'erreur à enregistrer
   * @returns {Promise<void>}
   */
  static async logErrorToDatabase(baseUrl, errorData) {
    try {
      console.log('📝 Préparation de l\'enregistrement de l\'erreur...');
      
      const enrichedErrorData = {
        ...errorData,
        timestamp: new Date().toISOString()
      };

      // 1. Capturer l'URL actuelle
      if (errorData.sessionId) {
        const currentUrl = await this.captureCurrentUrl(baseUrl, errorData.sessionId);
        if (currentUrl) {
          enrichedErrorData.currentUrl = currentUrl;
          console.log(`📍 URL capturée: ${currentUrl}`);
        }
      }

      // 2. Capturer le snapshot
      let snapshotUrls = {};
      if (errorData.sessionId && errorData.planActivationId) {
        const snapshotData = await this.captureSnapshot(baseUrl, errorData.sessionId);
        
        if (snapshotData) {
          // 3. Uploader vers Firebase Storage
          console.log('☁️ Upload des fichiers vers Firebase Storage...');
          
          const uploadResult = await FileUploadService.uploadSnapshot(
            snapshotData,
            errorData.planActivationId
          );

          if (uploadResult.success) {
            snapshotUrls = uploadResult.urls;
            enrichedErrorData.snapshotUrls = snapshotUrls;
            enrichedErrorData.snapshotFolder = uploadResult.folderName;
            
            console.log('✅ Fichiers uploadés vers Firebase Storage');

            // 4. Supprimer les fichiers locaux après upload réussi
            const localFiles = [
              snapshotData.htmlPath,
              snapshotData.screenshotPath,
              snapshotData.metadataPath
            ];
            
            await FileUploadService.deleteLocalFiles(localFiles);
          }
        }
      }

      // 5. Enregistrer l'erreur avec toutes les données enrichies
      await axios.post(`${baseUrl}/api/subscription/error`, enrichedErrorData);

      console.log('✅ Erreur enregistrée avec succès en base de données');
      
      if (Object.keys(snapshotUrls).length > 0) {
        console.log('📎 Fichiers disponibles:');
        if (snapshotUrls.htmlUrl) console.log(`   - HTML: ${snapshotUrls.htmlUrl}`);
        if (snapshotUrls.screenshotUrl) console.log(`   - Screenshot: ${snapshotUrls.screenshotUrl}`);
        if (snapshotUrls.metadataUrl) console.log(`   - Metadata: ${snapshotUrls.metadataUrl}`);
      }
      
    } catch (error) {
      console.error('❌ Impossible d\'enregistrer l\'erreur en base:', error.message);
      // Ne pas bloquer le processus si l'enregistrement échoue
    }
  }
}

module.exports = RetryHelper;
