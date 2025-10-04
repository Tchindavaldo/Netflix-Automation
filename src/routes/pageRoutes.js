const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pageController");

// Sauvegarder un snapshot complet de la page (HTML + screenshot + métadonnées)
router.post("/page/snapshot", pageController.saveSnapshot);

// Cliquer sur un bouton
router.post("/page/clickBtn", pageController.clickBtn);

// Sélectionner un plan Netflix
router.post("/page/selectPlan", pageController.selectPlan);

// Remplir un formulaire avec des valeurs dynamiques
router.post("/form/fill", pageController.fillForm);

// Remplir le formulaire de paiement avec des valeurs dynamiques
router.post("/payment/form/fill", pageController.fillPaymentForm);

// Sélectionner une méthode de paiement
router.post("/payment/select", pageController.selectPaymentMethod);

// Obtenir les informations de la page actuelle
router.get("/page/current", pageController.getCurrentPage);
router.post("/page/current", pageController.getCurrentPage);

// Revenir en arrière dans l'historique
router.post("/page/back", pageController.goBack);

module.exports = router;
