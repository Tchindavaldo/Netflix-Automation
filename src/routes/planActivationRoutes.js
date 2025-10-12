const express = require('express');
const router = express.Router();
const planActivationController = require('../controllers/planActivationController');

/**
 * Routes pour la gestion des activations de plans Netflix
 */

// POST /api/plan-activation - Créer une nouvelle activation
router.post('/', planActivationController.createActivation);

// GET /api/plan-activation/:id - Récupérer une activation par ID
router.get('/:id', planActivationController.getActivationById);

// GET /api/plan-activation/user/:userId - Récupérer toutes les activations d'un utilisateur
router.get('/user/:userId', planActivationController.getActivationsByUser);

// PUT /api/plan-activation/:id - Modifier une activation
router.put('/:id', planActivationController.updateActivation);

// DELETE /api/plan-activation/:id - Supprimer une activation
router.delete('/:id', planActivationController.deleteActivation);

// PUT /api/plan-activation/:id/status - Changer le statut d'une activation
router.put('/:id/status', planActivationController.changeActivationStatus);

// GET /api/plan-activation - Récupérer toutes les activations (avec pagination)
router.get('/', planActivationController.getAllActivations);

module.exports = router;
