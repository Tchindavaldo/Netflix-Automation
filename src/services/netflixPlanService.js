/**
 * Service pour la gestion des plans Netflix
 * Point d'entrée qui exporte toutes les méthodes de gestion des plans
 */
const netflixPlanService = {
  getAllPlans: require('./netflix/plans/getAllPlans'),
  getPlanById: require('./netflix/plans/getPlanById'),
  upsertPlan: require('./netflix/plans/upsertPlan'),
  deletePlan: require('./netflix/plans/deletePlan'),
  seedDefaultPlans: require('./netflix/plans/seedDefaultPlans')
};

module.exports = netflixPlanService;
