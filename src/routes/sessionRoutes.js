const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const startSessionHandler = require('../controllers/handlers/session/startSessionHandler');
const stopSessionHandler = require('../controllers/handlers/session/stopSessionHandler');
const { getAllActiveSessions, closeAllSessions } = require('../controllers/handlers/session/sessionManagementHandler');

// Démarrer une nouvelle session Netflix
router.post('/start', startSessionHandler);

// Redémarrer la session Netflix
router.post('/restart', sessionController.restartSession);

// Arrêter la session Netflix
router.post('/stop', stopSessionHandler);
router.post('/close', stopSessionHandler);

// Obtenir le statut de la session
router.get('/status', sessionController.getSessionStatus);

// Obtenir la liste de toutes les sessions actives
router.get('/list', getAllActiveSessions);

// Fermer toutes les sessions actives
router.post('/close-all', closeAllSessions);

module.exports = router;
