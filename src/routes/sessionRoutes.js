const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const startSessionHandler = require('../controllers/handlers/session/startSessionHandler');
const stopSessionHandler = require('../controllers/handlers/session/stopSessionHandler');
const { getAllActiveSessions, closeAllSessions } = require('../controllers/handlers/session/sessionManagementHandler');

/**
 * @swagger
 * /start:
 *   post:
 *     summary: Démarrer une nouvelle session Netflix
 *     tags:
 *       - Session
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Session démarrée avec succès
 */
router.post('/start', startSessionHandler);

/**
 * @swagger
 * /restart:
 *   post:
 *     summary: Redémarrer la session Netflix
 *     tags:
 *       - Session
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si dans body ou X-Session-Id)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: ID de la session à redémarrer
 *     responses:
 *       200:
 *         description: Session redémarrée
 *       400:
 *         description: ID de session manquant
 */
router.post('/restart', sessionController.restartSession);

/**
 * @swagger
 * /stop:
 *   post:
 *     summary: Arrêter la session Netflix
 *     tags:
 *       - Session
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si dans body ou X-Session-Id)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: ID de la session
 *     responses:
 *       200:
 *         description: Session arrêtée
 *       400:
 *         description: ID de session manquant
 *       404:
 *         description: Session non trouvée
 */
router.post('/stop', stopSessionHandler);
router.post('/close', stopSessionHandler);

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Obtenir le statut de la session
 *     tags:
 *       - Session
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si X-Session-Id fourni)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête (optionnel si sessionId fourni)
 *     responses:
 *       200:
 *         description: Statut de la session
 *       400:
 *         description: ID de session manquant
 */
router.get('/status', sessionController.getSessionStatus);

/**
 * @swagger
 * /list:
 *   get:
 *     summary: Lister toutes les sessions actives
 *     tags:
 *       - Session
 *     responses:
 *       200:
 *         description: Liste des sessions actives
 */
router.get('/list', getAllActiveSessions);

/**
 * @swagger
 * /close-all:
 *   post:
 *     summary: Fermer toutes les sessions actives
 *     tags:
 *       - Session
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Toutes les sessions fermées
 */
router.post('/close-all', closeAllSessions);

module.exports = router;
