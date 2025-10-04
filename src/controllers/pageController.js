const saveSnapshotHandler = require("./handlers/page/saveSnapshotHandler");
const clickBtnHandler = require("./handlers/page/clickBtnHandler");
const selectPlanHandler = require("./handlers/page/selectPlanHandler");
const fillFormHandler = require("./handlers/form/fillFormHandler");
const fillPaymentFormHandler = require("./handlers/form/fillPaymentFormHandler");
const selectPaymentMethodHandler = require("./handlers/page/selectPaymentMethodHandler");
const getCurrentPageHandler = require("./handlers/page/getCurrentPageHandler");
const goBackHandler = require("./handlers/page/goBackHandler");

/**
 * Contrôleur des pages/snapshots Netflix
 * Ce fichier sert de point d'entrée pour les routes et délègue le traitement
 * à des gestionnaires spécifiques pour chaque action.
 */
const pageController = {
  // Sauvegarder un snapshot complet de la page
  saveSnapshot: saveSnapshotHandler,

  // Cliquer sur un bouton
  clickBtn: clickBtnHandler,

  // Sélectionner un plan Netflix
  selectPlan: selectPlanHandler,

  // Remplir un formulaire avec des valeurs dynamiques
  fillForm: fillFormHandler,

  // Remplir le formulaire de paiement avec des valeurs dynamiques
  fillPaymentForm: fillPaymentFormHandler,

  // Sélectionner une méthode de paiement
  selectPaymentMethod: selectPaymentMethodHandler,

  // Obtenir les informations de la page actuelle
  getCurrentPage: getCurrentPageHandler,

  // Revenir en arrière dans l'historique
  goBack: goBackHandler,
};

module.exports = pageController;
