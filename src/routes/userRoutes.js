const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

/**
 * Routes des utilisateurs
 * Gère toutes les opérations CRUD sur les utilisateurs
 */

// GET - Récupérer tous les utilisateurs
router.get('/', userController.getAllUsers);

// GET - Récupérer un utilisateur par ID
router.get('/:id', userController.getUserById);

// GET - Récupérer un utilisateur par UID
router.get('/uid/:uid', userController.getUserByUID);

// GET - Récupérer un utilisateur par email
router.get('/email/:email', userController.getUserByEmail);

// POST - Créer un nouvel utilisateur
router.post('/', userController.createUser);

// PUT - Mettre à jour un utilisateur
router.put('/:id', userController.updateUser);

// DELETE - Supprimer un utilisateur
router.delete('/:id', userController.deleteUser);

module.exports = router;
