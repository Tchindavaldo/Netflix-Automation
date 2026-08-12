const express = require('express');
const { sendWhatsappMessageController } = require('../controllers/notifications/whatsapp/sendWhatsappMessage.controller');
const { sendOtpController } = require('../controllers/notifications/whatsapp/sendOtp.controller');
const { verifyOtpController } = require('../controllers/notifications/whatsapp/verifyOtp.controller');
const {
  getMessageCostController,
  getVerificationDetailsController,
} = require('../controllers/notifications/whatsapp/getMessageCost.controller');
const {
  requestAuthController,
  verifyAuthController,
  getCostSummaryController,
} = require('../controllers/notifications/whatsapp/whatsappAuth.controller');

const router = express.Router();

/**
 * @swagger
 * /api/whatsapp/auth/request:
 *   post:
 *     summary: Demander un code de connexion par WhatsApp
 *     description: >
 *       Première étape de l'authentification par numéro WhatsApp. Envoie un code
 *       à 6 chiffres via Bird (WhatsApp, avec repli SMS automatique) et journalise
 *       le coût. La réponse est identique que le numéro soit déjà inscrit ou non,
 *       afin de ne pas permettre l'énumération des comptes.
 *     tags: [WhatsApp Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber]
 *             properties:
 *               phoneNumber: { type: 'string', example: '696080087' }
 *     responses:
 *       200:
 *         description: Code envoyé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     verificationId: { type: 'string' }
 *                     phoneNumber: { type: 'string' }
 *                     expiresIn: { type: 'integer', example: 600 }
 *       400:
 *         description: Numéro invalide ou échec de l'envoi
 */
router.post('/auth/request', requestAuthController);

/**
 * @swagger
 * /api/whatsapp/auth/verify:
 *   post:
 *     summary: Valider le code et se connecter (ou s'inscrire)
 *     description: >
 *       Seconde étape. Bird valide le code, le coût réel est enregistré, puis
 *       l'utilisateur est connecté s'il existe ou créé sinon.
 *       Renvoie un **custom token Firebase** à usage unique : le frontend doit
 *       appeler `signInWithCustomToken(customToken)`. Firebase délivre alors un
 *       refresh token persistant — la session dure bien au-delà de six mois sans
 *       nouvelle saisie de code.
 *     tags: [WhatsApp Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, code]
 *             properties:
 *               phoneNumber: { type: 'string', example: '696080087' }
 *               code: { type: 'string', example: '123456' }
 *               name: { type: 'string', description: "Optionnel, utilisé à l'inscription" }
 *               email: { type: 'string', description: "Optionnel, utilisé à l'inscription" }
 *     responses:
 *       200:
 *         description: Connexion ou inscription réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', example: true }
 *                 message: { type: 'string', example: 'Connexion réussie' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     customToken: { type: 'string', description: 'À échanger via signInWithCustomToken' }
 *                     isNewUser: { type: 'boolean' }
 *                     user: { type: 'object' }
 *                     cost:
 *                       type: object
 *                       properties:
 *                         totalCost: { type: 'number', example: 0.009 }
 *                         currencyCode: { type: 'string', example: 'USD' }
 *       401:
 *         description: Code incorrect, expiré ou trop de tentatives
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', example: false }
 *                 message: { type: 'string', example: 'Code OTP incorrect' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     reason: { type: 'string', example: 'incorrect_code' }
 *                     attemptsRemaining: { type: 'integer', example: 3 }
 */
router.post('/auth/verify', verifyAuthController);

/**
 * @swagger
 * /api/whatsapp/costs/summary:
 *   get:
 *     summary: Récapitulatif des coûts Bird
 *     description: >
 *       Agrège les coûts enregistrés localement. Bird n'expose aucune vue
 *       agrégée par API : ce récapitulatif s'appuie sur la collection `birdCosts`,
 *       alimentée à chaque envoi puis complétée à la vérification.
 *     tags: [WhatsApp Auth]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: 'string', format: 'date-time' }
 *         description: Date ISO de début (incluse)
 *       - in: query
 *         name: to
 *         schema: { type: 'string', format: 'date-time' }
 *         description: Date ISO de fin (exclue)
 *     responses:
 *       200:
 *         description: Récapitulatif
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     count: { type: 'integer' }
 *                     verified: { type: 'integer' }
 *                     abandoned: { type: 'integer', description: 'Envoyés et facturés, code jamais saisi' }
 *                     totalCost: { type: 'number' }
 *                     currencyCode: { type: 'string' }
 *                     byChannel: { type: 'object', description: 'Coût et volume par canal' }
 */
router.get('/costs/summary', getCostSummaryController);

/**
 * @swagger
 * /api/whatsapp/message:
 *   post:
 *     summary: Envoyer un message WhatsApp via Bird
 *     description: >
 *       Envoie un message texte ou un message template. Hors de la fenêtre de service
 *       client WhatsApp de 24h, seul un message template est accepté par Meta.
 *       Utilisez "to" pour un destinataire unique ou "recipients" pour un envoi groupé.
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to: { type: 'string', description: 'Numéro destinataire (E.164, ex: +237698087460)', example: '+237698087460' }
 *               recipients:
 *                 type: array
 *                 description: 'Liste de numéros pour un envoi groupé (alternative à "to")'
 *                 items: { type: 'string' }
 *               text: { type: 'string', description: 'Contenu du message texte' }
 *               template:
 *                 type: object
 *                 description: 'Message template (exclusif avec "text")'
 *                 properties:
 *                   name: { type: 'string' }
 *                   projectId: { type: 'string' }
 *                   version: { type: 'string', default: 'latest' }
 *                   locale: { type: 'string', default: 'fr' }
 *                   variables: { type: 'object', description: 'Variables du template, ex: { "1": "Jean" }' }
 *     responses:
 *       200:
 *         description: Message WhatsApp envoyé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Payload invalide ou échec de l'envoi
 */
router.post('/message', sendWhatsappMessageController);

/**
 * @swagger
 * /api/whatsapp/otp/send:
 *   post:
 *     summary: Envoyer un code OTP par WhatsApp
 *     description: >
 *       Déclenche l'envoi d'un code de vérification via la Verify API de Bird.
 *       Le code est généré et validé par Bird ; il n'est jamais stocké côté MoobilPay.
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber]
 *             properties:
 *               phoneNumber: { type: 'string', example: '+237698087460' }
 *               userId: { type: 'string', description: 'UID utilisateur (optionnel, pour traçabilité)' }
 *     responses:
 *       200:
 *         description: Code OTP envoyé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', example: true }
 *                 message: { type: 'string' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     verificationId: { type: 'string' }
 *                     phoneNumber: { type: 'string' }
 *                     expiresAt: { type: 'string', format: 'date-time' }
 *       400:
 *         description: Numéro invalide ou échec de l'envoi
 */
router.post('/otp/send', sendOtpController);

/**
 * @swagger
 * /api/whatsapp/otp/verify:
 *   post:
 *     summary: Vérifier un code OTP reçu par WhatsApp
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               phoneNumber: { type: 'string', example: '+237698087460' }
 *               code: { type: 'string', example: '123456' }
 *               verificationId: { type: 'string', description: 'Optionnel : évite la résolution par numéro' }
 *     responses:
 *       200:
 *         description: Code OTP validé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Code invalide, expiré ou nombre de tentatives dépassé
 */
router.post('/otp/verify', verifyOtpController);

/**
 * @swagger
 * /api/whatsapp/message/{id}/cost:
 *   get:
 *     summary: Lire un message envoyé et son coût de facturation
 *     description: >
 *       Retourne le coût total (montant + devise) et le détail de facturation
 *       (tarif par segment, segments facturés, pays de destination, surtaxe
 *       opérateur). La réponse brute de Bird est incluse dans `data.raw`.
 *     tags: [WhatsApp]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *         description: "Identifiant du message retourné à l'envoi"
 *       - in: query
 *         name: channel
 *         schema: { type: 'string', enum: ['whatsapp', 'sms'], default: 'whatsapp' }
 *     responses:
 *       200:
 *         description: Coût du message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     messageId: { type: 'string' }
 *                     channel: { type: 'string' }
 *                     segments: { type: 'object' }
 *                     cost:
 *                       type: object
 *                       properties:
 *                         amount: { type: 'number' }
 *                         currencyCode: { type: 'string' }
 *                         breakdown: { type: 'object' }
 *                     raw: { type: 'object', description: 'Réponse brute de Bird' }
 *       400:
 *         description: Identifiant inconnu ou canal non supporté
 */
router.get('/message/:id/cost', getMessageCostController);

/**
 * @swagger
 * /api/whatsapp/verification/{id}:
 *   get:
 *     summary: Diagnostiquer une vérification OTP
 *     description: >
 *       Retourne le détail complet d'une vérification : tentatives par canal
 *       (WhatsApp puis SMS en repli), statut de livraison, erreur éventuelle et
 *       coûts. C'est l'appel à utiliser quand un code OTP n'arrive pas — il
 *       révèle la cause exacte (solde insuffisant, pays non couvert, numéro
 *       invalide...).
 *     tags: [WhatsApp]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *         description: "Identifiant de vérification retourné par /otp/send"
 *     responses:
 *       200:
 *         description: Détail de la vérification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     verificationId: { type: 'string' }
 *                     status: { type: 'string' }
 *                     destinationCountry: { type: 'string', example: 'CM' }
 *                     attempts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           channel: { type: 'string', example: 'whatsapp' }
 *                           deliveryStatus: { type: 'string', example: 'undelivered' }
 *                           error: { type: 'string', nullable: true }
 *                     totalCost: { type: 'object' }
 *       400:
 *         description: Identifiant de vérification inconnu
 */
router.get('/verification/:id', getVerificationDetailsController);

module.exports = router;
