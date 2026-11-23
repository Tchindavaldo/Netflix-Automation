const express = require('express');
const router = express.Router();
const passwordManagerController = require('../controllers/passwordManagerController');

/**
 * @swagger
 * /api/netflix/credentials:
 *   get:
 *     summary: Récupérer tous les credentials Netflix (admin)
 *     tags: [Netflix Credentials]
 *     responses:
 *       200:
 *         description: Liste des identifiants Netflix
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NetflixCredentials'
 */
router.get('/credentials', passwordManagerController.getAllCredentials);

/**
 * @swagger
 * /api/netflix/credentials/user/{userId}:
 *   get:
 *     summary: Récupérer les identifiants Netflix d'un utilisateur spécifique
 *     tags: [Netflix Credentials]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Identifiants Netflix de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/NetflixCredentials'
 */
router.get('/credentials/user/:userId', passwordManagerController.getCredentialsByUserId);

/**
 * @swagger
 * /api/netflix/credentials/{id}:
 *   get:
 *     summary: Récupérer des identifiants par leur ID Firestore
 *     tags: [Netflix Credentials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails des identifiants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/NetflixCredentials'
 */
router.get('/credentials/:id', passwordManagerController.getCredentialsById);

/**
 * @swagger
 * /api/netflix/credentials/create:
 *   post:
 *     summary: Créer de nouveaux identifiants Netflix
 *     tags: [Netflix Credentials]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, email, password_text]
 *             properties:
 *               user_id: { type: 'string' }
 *               email: { type: 'string' }
 *               password_text: { type: 'string' }
 *               nom: { type: 'string' }
 *               prenom: { type: 'string' }
 *     responses:
 *       201:
 *         description: Création réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/credentials/create', passwordManagerController.createCredentials);

/**
 * @swagger
 * /api/netflix/credentials/{id}:
 *   put:
 *     summary: Mettre à jour des identifiants Netflix
 *     tags: [Netflix Credentials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: 'string' }
 *               password_text: { type: 'string' }
 *               nom: { type: 'string' }
 *               prenom: { type: 'string' }
 *     responses:
 *       200:
 *         description: Mise à jour réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.put('/credentials/:id', passwordManagerController.updateCredentials);

/**
 * @swagger
 * /api/netflix/credentials/{id}:
 *   delete:
 *     summary: Supprimer des identifiants Netflix
 *     tags: [Netflix Credentials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Suppression réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/credentials/:id', passwordManagerController.deleteCredentials);

/**
 * @swagger
 * /api/netflix/credentials:
 *   post:
 *     summary: Endpoint legacy - Récupère ou Crée (Upsert) des credentials Netflix
 *     description: Cet endpoint est utilisé par le dashboard pour créer/récupérer rapidement des accès
 *     tags: [Netflix Credentials]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: 'string' }
 *               email: { type: 'string' }
 *               password_text: { type: 'string' }
 *     responses:
 *       200:
 *         description: Succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/credentials', passwordManagerController.handleNetflixCredentials);

module.exports = router;
