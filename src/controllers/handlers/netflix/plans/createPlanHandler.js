const netflixPlanService = require('../../../../services/netflixPlanService');

/**
 * Handler pour créer un nouveau plan (ou écraser)
 * Route: POST /api/netflix/plans
 */
const createPlanHandler = async (req, res) => {
  try {
    const { id, ...planData } = req.body;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID du plan requis (ex: 'premium')"
      });
    }

    const plan = await netflixPlanService.upsertPlan(id, { ...planData, active: true });
    
    return res.status(201).json({
      success: true,
      message: "Plan créé avec succès",
      data: plan
    });
  } catch (error) {
    console.error('❌ Erreur createPlanHandler:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la création du plan",
      error: error.message
    });
  }
};

module.exports = createPlanHandler;
