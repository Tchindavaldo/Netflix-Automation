const saveSnapshotHandler = require("./handlers/page/saveSnapshotHandler");
const goToPlanHandler = require("./handlers/page/goToPlanHandler");

/**
 * Contrôleur des pages/snapshots Netflix
 * Ce fichier sert de point d'entrée pour les routes et délègue le traitement
 * à des gestionnaires spécifiques pour chaque action.
 */
const pageController = {
  // Sauvegarder un snapshot complet de la page
  saveSnapshot: saveSnapshotHandler,

  // Cliquer sur un bouton pour aller vers le plan
  goToPlan: goToPlanHandler,
};

module.exports = pageController;
