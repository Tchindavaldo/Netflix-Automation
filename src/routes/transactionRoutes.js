const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

/**
 * @swagger
 * /api/transaction/user/{userId}:
 *   get:
 *     summary: Récupérer les transactions d'un utilisateur
 *     description: Retourne l'historique des transactions d'un utilisateur avec pagination.
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre max de résultats
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *       - in: query
 *         name: all
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Mettre à 'true' pour tout récupérer sans pagination
 *     responses:
 *       200:
 *         description: Liste des transactions
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
 *                     $ref: '#/components/schemas/Transaction'
 *                 totalSpent:
 *                   type: number
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/user/:userId', transactionController.getTransactionsByUser);

/**
 * @swagger
 * /api/transaction/activation/{activationId}:
 *   get:
 *     summary: Récupérer les transactions liées à une activation
 *     description: Retourne toutes les transactions liées à l'ID d'une activation spécifique.
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: activationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'activation
 *     responses:
 *       200:
 *         description: Liste des transactions
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
 *                     $ref: '#/components/schemas/Transaction'
 */
router.get('/activation/:activationId', transactionController.getTransactionsByActivation);

module.exports = router;
