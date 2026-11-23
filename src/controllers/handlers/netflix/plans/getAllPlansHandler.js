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
      data: plans,
      // Mode review Apple : indique au front de court-circuiter tout le flux
      // de paiement (piloté par la même var d'env que le skip webview).
      appleReviewMode: process.env.APPLE_REVIEW_MODE === 'true'
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
