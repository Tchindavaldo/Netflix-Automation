const subscriptionErrorService = require('../services/subscriptionErrorService');

/**
 * Contrôleur pour la gestion des erreurs d'abonnement
 */
const subscriptionErrorController = {
  /**
   * Enregistrer une erreur d'abonnement
   */
  logError: async (req, res) => {
    try {
      // Vérifier que des données ont bien été reçues
      if (!req.body || Object.keys(req.body).length === 0) {
        // console.error('❌ Aucune donnée reçue dans la requête');
        return res.status(400).json({
          success: false,
          message: 'Aucune donnée reçue dans la requête',
          receivedData: req.body
        });
      }

      const errorData = req.body;
      
      // Journalisation détaillée des données reçues
      // console.log('📥 Données d\'erreur reçues:', {
      //   headers: req.headers,
      //   body: {
      //     stepName: errorData.stepName,
      //     error: errorData.error ? (errorData.error.message || errorData.error) : 'Aucune erreur fournie',
      //     userId: errorData.userId || 'Non fourni',
      //     planActivationId: errorData.planActivationId || 'Non fourni',
      //     hasCardInfo: !!errorData.cardInfo,
      //     hasSnapshotUrls: !!errorData.snapshotUrls,
      //     hasErrorContext: !!errorData.errorContext,
      //     receivedAt: new Date().toISOString()
      //   }
      // });

      // Valider les données requises
      const missingFields = [];
      if (!errorData.stepName) missingFields.push('stepName');
      if (!errorData.error) missingFields.push('error');
      if (!errorData.userId) missingFields.push('userId');
      if (!errorData.planActivationId) missingFields.push('planActivationId');

      if (missingFields.length > 0) {
        // console.warn('⚠️ Données d\'erreur incomplètes. Champs manquants:', missingFields);
        // On continue quand même le traitement, mais avec des valeurs par défaut
      }

      try {
        const result = await subscriptionErrorService.logError(errorData);
        
        if (!result || !result.id) {
          throw new Error('Le service n\'a pas retourné d\'ID valide');
        }
        
        // Journaliser le résultat réussi
        // console.log('✅ Erreur enregistrée avec succès:', {
        //   errorId: result.id,
        //   stepName: result.stepName,
        //   timestamp: result.timestamp,
        //   hasCardInfo: !!result.cardInfo,
        //   hasSnapshotUrls: !!result.snapshotUrls,
        //   firestoreId: result.id
        // });

        return res.status(201).json({
          success: true,
          message: 'Erreur enregistrée avec succès',
          data: {
            id: result.id,
            stepName: result.stepName,
            timestamp: result.timestamp,
            hasSnapshot: !!result.snapshotUrls,
            hasCardInfo: !!result.cardInfo,
            firestoreId: result.id
          }
        });
      } catch (serviceError) {
        // console.error('❌ Erreur lors de l\'appel au service d\'erreur:', {
        //   message: serviceError.message,
        //   stack: serviceError.stack,
        //   errorData: {
        //     stepName: errorData.stepName,
        //     error: errorData.error?.message || errorData.error,
        //     hasCardInfo: !!errorData.cardInfo,
        //     hasSnapshotUrls: !!errorData.snapshotUrls
        //   }
        // });
        
        // Essayer d'enregistrer l'échec dans un autre endroit
        try {
          await db.collection('error_logs').add({
            type: 'subscription_error_failure',
            originalData: errorData,
            serviceError: serviceError.toString(),
            timestamp: new Date().toISOString()
          });
        } catch (logError) {
          // console.error('❌ Impossible d\'enregistrer l\'échec de log:', logError);
        }
        
        throw serviceError; // Relancer pour le catch principal
      }

    } catch (error) {
      // console.error('❌ Erreur lors de l\'enregistrement de l\'erreur:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'enregistrement de l\'erreur'
      });
    }
  },

  /**
   * Récupérer les erreurs par planActivationId
   */
  getErrorsByActivationId: async (req, res) => {
    try {
      const { planActivationId } = req.params;

      if (!planActivationId) {
        return res.status(400).json({
          success: false,
          message: 'Paramètre manquant: planActivationId',
          missingParameters: ['planActivationId']
        });
      }

      const errors = await subscriptionErrorService.getErrorsByActivationId(planActivationId);

      res.status(200).json({
        success: true,
        data: errors,
        count: errors.length
      });

    } catch (error) {
      // console.error('❌ Erreur lors de la récupération des erreurs:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la récupération des erreurs'
      });
    }
  }
};

module.exports = subscriptionErrorController;
