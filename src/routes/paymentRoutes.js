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

module.exports = router;
