const netflixPlanService = require('../../../../services/netflixPlanService');

/**
 * Handler pour récupérer tous les plans Netflix (actifs)
 * GET /api/netflix/plans
 */
const getAllPlansHandler = async (req, res) => {
  try {
    const plans = await netflixPlanService.getAllPlans();
    return res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('❌ Erreur getAllPlansHandler:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des plans",
      error: error.message
    });
  }
};

module.exports = getAllPlansHandler;
