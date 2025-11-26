const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Vérifier l'état du serveur
 *     description: Retourne le statut du serveur et les informations de service
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Serveur actif
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: Netflix Automation API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 */
router.get('/', (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "Netflix Automation API",
    version: process.env.npm_package_version || "1.0.0"
  });
});

module.exports = router;
