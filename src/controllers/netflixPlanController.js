/**
 * Contrôleur pour la gestion des plans Netflix
 * Ce fichier sert de point d'entrée pour les routes de gestion des plans
 * et délègue le traitement aux gestionnaires spécifiques.
 */
const netflixPlanController = {
  // GET - Récupérer tous les plans
  getAllPlans: require('./handlers/netflix/plans/getAllPlansHandler'),
  
  // GET - Récupérer un plan par ID
  getPlanById: require('./handlers/netflix/plans/getPlanByIdHandler'),
  
  // POST - Créer un nouveau plan
  createPlan: require('./handlers/netflix/plans/createPlanHandler'),
  
  // PUT - Mettre à jour un plan existant
  updatePlan: require('./handlers/netflix/plans/updatePlanHandler'),
  
  // DELETE - Désactiver un plan
  deletePlan: require('./handlers/netflix/plans/deletePlanHandler')
};

module.exports = netflixPlanController;
