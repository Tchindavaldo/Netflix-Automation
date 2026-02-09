const passwordManagerController = require("../controllers/passwordManagerController");
const express = require("express");
const router = express.Router();

// Routes CRUD pour la gestion des identifiants Netflix

// GET - Récupérer tous les identifiants (admin)
router.get("/credentials", passwordManagerController.getAllCredentials);

// GET - Récupérer les identifiants par userId
router.get("/credentials/user/:userId", passwordManagerController.getCredentialsByUserId);

// GET - Récupérer les identifiants par ID
router.get("/credentials/:id", passwordManagerController.getCredentialsById);

// POST - Créer de nouveaux identifiants
router.post("/credentials/create", passwordManagerController.createCredentials);

// PUT - Mettre à jour les identifiants
router.put("/credentials/:id", passwordManagerController.updateCredentials);

// DELETE - Supprimer les identifiants
router.delete("/credentials/:id", passwordManagerController.deleteCredentials);

// POST - Endpoint legacy pour gérer (get ou create) les identifiants Netflix
// Utilisé par le frontend pour simplifier le workflow
router.post("/credentials", passwordManagerController.handleNetflixCredentials);

module.exports = router;
