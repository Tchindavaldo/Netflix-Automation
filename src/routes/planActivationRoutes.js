const express = require('express');
const router = express.Router();
const planActivationController = require('../controllers/planActivationController');

/**
 * @swagger
 * /:
 *   get:
 *     summary: Récupérer toutes les activations
 *     tags:
 *       - Plan Activation
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre d'activations par page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Décalage pour la pagination
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *         description: Filtrer par statut
 *     responses:
 *       200:
 *         description: Liste des activations
 *   post:
 *     summary: Créer une nouvelle activation
 *     tags:
 *       - Plan Activation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - planNetflix
 *               - amount
 *               - reqteStatusSuccess
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *               planNetflix:
 *                 type: string
 *                 description: Type de plan Netflix
 *               amount:
 *                 type: number
 *                 description: Montant de l'activation
 *               statut:
 *                 type: string
 *                 description: Statut initial (défaut pending)
 *               reqteStatusSuccess:
 *                 type: string
 *                 enum: [pending, failed, success]
 *                 description: Statut de la requête
 *               numeroOM:
 *                 type: string
 *                 description: Numéro Orange Money (optionnel)
 *               email:
 *                 type: string
 *                 description: Email (optionnel)
 *               typePaiement:
 *                 type: string
 *                 description: Type de paiement (défaut orange_money)
 *               dureeActivation:
 *                 type: integer
 *                 description: Durée en jours (défaut 30)
 *               dateExpiration:
 *                 type: string
 *                 description: Date d'expiration (optionnel)
 *     responses:
 *       201:
 *         description: Activation créée
 *       400:
 *         description: Champs manquants ou invalides
 */
router.post('/', planActivationController.createActivation);
router.get('/', planActivationController.getAllActivations);

/**
 * @swagger
 * /{id}:
 *   get:
 *     summary: Récupérer une activation par ID
 *     tags:
 *       - Plan Activation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'activation
 *     responses:
 *       200:
 *         description: Activation trouvée
 *   put:
 *     summary: Modifier une activation
 *     tags:
 *       - Plan Activation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'activation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planType:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Activation modifiée
 *   delete:
 *     summary: Supprimer une activation
 *     tags:
 *       - Plan Activation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'activation
 *     responses:
 *       200:
 *         description: Activation supprimée
 */
router.get('/:id', planActivationController.getActivationById);
router.put('/:id', planActivationController.updateActivation);
router.delete('/:id', planActivationController.deleteActivation);

/**
 * @swagger
 * /{id}/status:
 *   put:
 *     summary: Changer le statut d'une activation
 *     tags:
 *       - Plan Activation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'activation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, active, completed, failed]
 *     responses:
 *       200:
 *         description: Statut modifié
 */
router.put('/:id/status', planActivationController.changeActivationStatus);

/**
 * @swagger
 * /user/{userId}:
 *   get:
 *     summary: Récupérer les activations d'un utilisateur
 *     tags:
 *       - Plan Activation
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Activations trouvées
 */
router.get('/user/:userId', planActivationController.getActivationsByUser);

module.exports = router;
