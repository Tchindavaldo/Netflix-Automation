const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const subscriptionErrorController = require('../controllers/subscriptionErrorController');

/**
 * @swagger
 * /init:
 *   post:
 *     summary: Initialiser le processus d'abonnement Netflix
 *     tags:
 *       - Subscription
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - typeDePlan
 *               - email
 *               - motDePasse
 *               - planActivationId
 *               - userId
 *             properties:
 *               typeDePlan:
 *                 type: string
 *                 enum: [mobile, basic, standard, premium]
 *                 description: Type de plan Netflix
 *               email:
 *                 type: string
 *                 description: Email de l'utilisateur
 *               motDePasse:
 *                 type: string
 *                 description: Mot de passe Netflix
 *               planActivationId:
 *                 type: string
 *                 description: ID de l'activation du plan
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Processus d'abonnement initialisé
 *       400:
 *         description: Paramètres manquants ou invalides
 */
router.post('/init', subscriptionController.initSubscriptionProcess);

/**
 * @swagger
 * /error:
 *   post:
 *     summary: Enregistrer une erreur d'abonnement
 *     tags:
 *       - Subscription
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stepName
 *               - error
 *               - userId
 *               - planActivationId
 *             properties:
 *               stepName:
 *                 type: string
 *                 description: Nom de l'étape où l'erreur s'est produite
 *               error:
 *                 type: string
 *                 description: Message d'erreur
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *               planActivationId:
 *                 type: string
 *                 description: ID de l'activation du plan
 *               cardInfo:
 *                 type: object
 *                 description: Informations de carte (optionnel)
 *               snapshotUrls:
 *                 type: array
 *                 description: URLs des snapshots (optionnel)
 *               errorContext:
 *                 type: object
 *                 description: Contexte d'erreur additionnel (optionnel)
 *     responses:
 *       201:
 *         description: Erreur enregistrée
 *       400:
 *         description: Données manquantes
 */
router.post('/error', subscriptionErrorController.logError);

/**
 * @swagger
 * /error/{planActivationId}:
 *   get:
 *     summary: Récupérer les erreurs par planActivationId
 *     tags:
 *       - Subscription
 *     parameters:
 *       - in: path
 *         name: planActivationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'activation du plan
 *     responses:
 *       200:
 *         description: Erreurs trouvées
 */
router.get('/error/:planActivationId', subscriptionErrorController.getErrorsByActivationId);

/**
 * @swagger
 * /cancel:
 *   post:
 *     summary: Annuler la vérification d'un paiement en cours
 *     tags:
 *       - Subscription
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: ID de la transaction à annuler
 *     responses:
 *       200:
 *         description: Annulation enregistrée
 *       404:
 *         description: Transaction non trouvée
 */
router.post('/cancel', subscriptionController.cancelPaymentVerification);

module.exports = router;
