const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Initialiser un paiement Orange Money
router.post('/initpaiment', paymentController.initPayment);

module.exports = router;
