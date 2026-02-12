const express = require('express');
const router = express.Router();
const netflixPlanController = require('../controllers/netflixPlanController');

/**
 * Routes pour la gestion des plans Netflix
 * Préfixe: /api/netflix/plans
 */

router.get('/', netflixPlanController.getAllPlans);
router.get('/:id', netflixPlanController.getPlanById);
router.post('/', netflixPlanController.createPlan);
router.put('/:id', netflixPlanController.updatePlan);
router.delete('/:id', netflixPlanController.deletePlan);

module.exports = router;
