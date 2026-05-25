const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authUser = require('../middleware/authUser');

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Récupérer tous les utilisateurs
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *   post:
 *     summary: Créer un nouvel utilisateur
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utilisateur créé
 */
router.get('/', userController.getAllUsers);
router.post('/', authUser, userController.createUser);

// Push tokens multi-device
router.post('/push-token/add', authUser, userController.addPushToken);
router.post('/push-token/remove', authUser, userController.removePushToken);

/**
 * @swagger
 * /api/user/{id}:
 *   get:
 *     summary: Récupérer un utilisateur par ID
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 *   put:
 *     summary: Mettre à jour un utilisateur
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour
 *   delete:
 *     summary: Supprimer un utilisateur
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Utilisateur supprimé
 */
router.get('/:id', authUser, userController.getUserById);
router.put('/:id', authUser, userController.updateUser);
router.delete('/:id', authUser, userController.deleteUser);

/**
 * @swagger
 * /api/user/uid/{uid}:
 *   get:
 *     summary: Récupérer un utilisateur par UID
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 */
router.get('/uid/:uid', authUser, userController.getUserByUID);

/**
 * @swagger
 * /api/user/email/{email}:
 *   get:
 *     summary: Récupérer un utilisateur par email
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 */
router.get('/email/:email', userController.getUserByEmail);

module.exports = router;
