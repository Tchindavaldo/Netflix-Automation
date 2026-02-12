const netflixPlanService = require('../../../../services/netflixPlanService');

/**
 * Handler pour récupérer un plan spécifique par ID
 * Route: GET /api/netflix/plans/:id
 */
const getPlanByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await netflixPlanService.getPlanById(id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan non trouvé"
      });
    }

    return res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('❌ Erreur getPlanByIdHandler:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du plan",
      error: error.message
    });
  }
};

module.exports = getPlanByIdHandler;
