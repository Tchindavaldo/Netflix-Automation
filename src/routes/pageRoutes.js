const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pageController");

// Sauvegarder un snapshot complet de la page (HTML + screenshot + métadonnées)
router.post("/page/snapshot", pageController.saveSnapshot);

// Cliquer sur un bouton pour aller vers le plan
router.post("/page/goToPlan", pageController.goToPlan);

module.exports = router;
