const express = require('express');
const router = express.Router();
const uploadSnapshotHandler = require('../controllers/handlers/drive/uploadSnapshotHandler');

/**
 * @route POST /api/drive/upload-snapshot
 * @description Upload manuellement des snapshots locaux vers Google Drive
 * @body {
 *   userId: string (obligatoire),
 *   planActivationId: string (obligatoire),
 *   snapshotFiles: {
 *     htmlPath: string (obligatoire),
 *     screenshotPath: string (optionnel),
 *     metadataPath: string (optionnel)
 *   },
 *   deleteAfterUpload: boolean (optionnel, par défaut false)
 * }
 */
router.post('/upload-snapshot', uploadSnapshotHandler);

module.exports = router;
