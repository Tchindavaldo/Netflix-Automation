const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

/**
 * @swagger
 * /initpaiment:
 *   post:
 *     summary: Initialiser un paiement Orange Money
 *     tags:
 *       - Payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - numeroOM
 *               - email
 *               - motDePasse
 *               - typeDePlan
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *               numeroOM:
 *                 type: string
 *                 description: Numéro Orange Money
 *               email:
 *                 type: string
 *                 description: Email de l'utilisateur
 *               motDePasse:
 *                 type: string
 *                 description: Mot de passe Netflix
 *               typeDePlan:
 *                 type: string
 *                 enum: [mobile, basic, standard, premium]
 *                 description: Type de plan Netflix
 *               amount:
 *                 type: number
 *                 description: Montant du paiement (optionnel, sinon calculé automatiquement)
 *     responses:
 *       200:
 *         description: Paiement initialisé
 *       400:
 *         description: Paramètres manquants ou invalides
 */
router.post('/initpaiment', paymentController.initPayment);

/**
 * @swagger
 * /init-mobile-money:
 *   post:
 *     summary: Initialiser un paiement Mobile Money (Nouveau endpoint)
 *     tags:
 *       - Payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - email
 *               - phone
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *               senderName:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       200:
 *         description: Paiement initialisé avec transactionId et paymentLink
 */
router.post('/init-mobile-money', paymentController.initMobileMoneyPayment);

module.exports = router;
