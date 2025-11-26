const express = require('express');
const router = express.Router();
const uploadSnapshotHandler = require('../controllers/handlers/drive/uploadSnapshotHandler');

/**
 * @swagger
 * /upload-snapshot:
 *   post:
 *     summary: Upload des snapshots vers Google Drive
 *     tags:
 *       - Drive
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - planActivationId
 *               - snapshotFiles
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *               planActivationId:
 *                 type: string
 *                 description: ID de l'activation du plan
 *               snapshotFiles:
 *                 type: object
 *                 required:
 *                   - htmlPath
 *                 properties:
 *                   htmlPath:
 *                     type: string
 *                     description: Chemin du fichier HTML
 *                   screenshotPath:
 *                     type: string
 *                     description: Chemin du screenshot (optionnel)
 *                   metadataPath:
 *                     type: string
 *                     description: Chemin des métadonnées (optionnel)
 *               deleteAfterUpload:
 *                 type: boolean
 *                 description: Supprimer après upload (optionnel, défaut false)
 *     responses:
 *       200:
 *         description: Snapshots uploadés avec succès
 *       400:
 *         description: Erreur de validation
 *       500:
 *         description: Erreur serveur
 */
router.post('/upload-snapshot', uploadSnapshotHandler);

module.exports = router;
