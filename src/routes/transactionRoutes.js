const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

/**
 * @swagger
 * /user/{userId}:
 *   get:
 *     summary: Récupérer les transactions d'un utilisateur
 *     tags: [Transactions]
 */
router.get('/user/:userId', transactionController.getTransactionsByUser);

/**
 * @swagger
 * /activation/{activationId}:
 *   get:
 *     summary: Récupérer les transactions liées à une activation
 *     tags: [Transactions]
 */
router.get('/activation/:activationId', transactionController.getTransactionsByActivation);

module.exports = router;
