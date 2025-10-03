const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// Démarrer une nouvelle session Netflix
router.post('/start', sessionController.startSession);

// Redémarrer la session Netflix
router.post('/restart', sessionController.restartSession);

// Arrêter la session Netflix
router.post('/stop', sessionController.stopSession);

// Obtenir le statut de la session
router.get('/status', sessionController.getSessionStatus);

module.exports = router;
