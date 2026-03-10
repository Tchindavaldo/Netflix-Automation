const transactionService = require('../services/transactionService');

const transactionController = {
  /**
   * Récupérer les transactions d'un utilisateur
   */
  getTransactionsByUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0, all } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId requis'
        });
      }

      const result = await transactionService.getTransactionsByUser(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        includeAll: all === 'true'
      });

      res.status(200).json({
        success: true,
        data: result.transactions,
        totalSpent: result.totalSpent,
        pagination: {
          total: result.total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Récupérer les transactions d'une activation
   */
  getTransactionsByActivation: async (req, res) => {
    try {
      const { activationId } = req.params;

      if (!activationId) {
        return res.status(400).json({
          success: false,
          message: 'activationId requis'
        });
      }

      const transactions = await transactionService.getTransactionsByActivation(activationId);

      res.status(200).json({
        success: true,
        data: transactions
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = transactionController;
