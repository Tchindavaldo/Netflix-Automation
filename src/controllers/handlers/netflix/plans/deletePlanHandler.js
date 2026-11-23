const netflixPlanService = require('../../../../services/netflixPlanService');

/**
 * Handler pour désactiver un plan
 * Route: DELETE /api/netflix/plans/:id
 */
const deletePlanHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await netflixPlanService.deletePlan(id);
    
    return res.json({
      success: true,
      message: "Plan désactivé avec succès"
    });
  } catch (error) {
    console.error('❌ Erreur deletePlanHandler:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du plan",
      error: error.message
    });
  }
};

module.exports = deletePlanHandler;
