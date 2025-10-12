const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const subscriptionErrorController = require('../controllers/subscriptionErrorController');

/**
 * Routes pour la gestion du processus d'abonnement Netflix
 */

// POST /api/subscription/init - Initialiser le processus complet d'abonnement Netflix
router.post('/init', subscriptionController.initSubscriptionProcess);

// POST /api/subscription/error - Enregistrer une erreur d'abonnement
router.post('/error', subscriptionErrorController.logError);

// GET /api/subscription/error/:planActivationId - Récupérer les erreurs par planActivationId
router.get('/error/:planActivationId', subscriptionErrorController.getErrorsByActivationId);

module.exports = router;
