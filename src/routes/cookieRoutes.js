const express = require('express');
const router = express.Router();
const cookieController = require('../controllers/cookieController');

// Récupérer les cookies de la session
router.get('/cookies', cookieController.getCookies);

// Mettre à jour les cookies de la session
router.post('/cookies/update', cookieController.updateCookies);

module.exports = router;
