const express = require('express');
const router = express.Router();
const cookieController = require('../controllers/cookieController');

/**
 * @swagger
 * /cookies:
 *   get:
 *     summary: Récupérer les cookies de la session
 *     tags:
 *       - Cookies
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si X-Session-Id)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête
 *     responses:
 *       200:
 *         description: Cookies récupérés
 *       400:
 *         description: ID de session manquant
 *       404:
 *         description: Session non trouvée
 */
router.get('/cookies', cookieController.getCookies);

/**
 * @swagger
 * /cookies/update:
 *   post:
 *     summary: Mettre à jour les cookies de la session
 *     tags:
 *       - Cookies
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si X-Session-Id)
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
 *     responses:
 *       200:
 *         description: Cookies mis à jour
 *       400:
 *         description: ID de session manquant
 *       404:
 *         description: Session non trouvée
 */
router.post('/cookies/update', cookieController.updateCookies);

module.exports = router;
