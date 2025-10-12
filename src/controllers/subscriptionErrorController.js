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
      const errorData = req.body;

      const result = await subscriptionErrorService.logError(errorData);

      res.status(201).json({
        success: true,
        message: 'Erreur enregistrée avec succès',
        data: result
      });

    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement de l\'erreur:', error);
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
      console.error('❌ Erreur lors de la récupération des erreurs:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la récupération des erreurs'
      });
    }
  }
};

module.exports = subscriptionErrorController;
