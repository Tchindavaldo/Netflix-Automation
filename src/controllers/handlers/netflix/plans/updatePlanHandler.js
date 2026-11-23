const netflixPlanService = require('../../../../services/netflixPlanService');

/**
 * Handler pour mettre à jour un plan existant
 * Route: PUT /api/netflix/plans/:id
 */
const updatePlanHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await netflixPlanService.upsertPlan(id, req.body);
    
    return res.json({
      success: true,
      message: "Plan mis à jour avec succès",
      data: plan
    });
  } catch (error) {
    console.error('❌ Erreur updatePlanHandler:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du plan",
      error: error.message
    });
  }
};

module.exports = updatePlanHandler;
