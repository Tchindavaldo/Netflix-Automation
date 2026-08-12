const express = require('express');
const {
  sendSmsController,
  getSmsStatusController,
  listSmsTemplatesController,
} = require('../controllers/notifications/sms/sendSms.controller');

const router = express.Router();

/**
 * @swagger
 * /api/sms/send:
 *   post:
 *     summary: Envoyer un SMS via Bird
 *     description: >
 *       Deux modes d'envoi. **Par template** (recommandé) : fournir `template` et
 *       ses `parameters` — Bird choisit l'expéditeur partagé, aucun `from` n'est
 *       requis. **En texte libre** : fournir `text`, `category` et `from`.
 *       ⚠️ Le texte libre échoue tant qu'aucun expéditeur n'est enregistré sur le
 *       workspace ; c'est le cas aujourd'hui, seul le mode template fonctionne.
 *       La réponse `202 accepted` ne garantit pas la livraison, et le coût vaut
 *       `null` tant que Bird n'a pas tarifé le message.
 *     tags: [SMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to]
 *             properties:
 *               to: { type: 'string', example: '696080087' }
 *               template: { type: 'string', example: 'bird_payment_confirmation' }
 *               parameters:
 *                 type: object
 *                 description: 'Variables du template'
 *                 example: { amount: '5000', currency: 'XAF', date: '2026-08-12' }
 *               language: { type: 'string', example: 'en' }
 *               text: { type: 'string', description: 'Texte libre (nécessite from)' }
 *               category: { type: 'string', enum: ['transactional','marketing','authentication','service'] }
 *               from: { type: 'string', description: 'Expéditeur, requis en texte libre' }
 *               metadata: { type: 'object', description: 'Contexte renvoyé sur les webhooks (max 2 Ko)' }
 *     responses:
 *       200:
 *         description: SMS accepté par Bird
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     messageId: { type: 'string', example: 'sms_01kztn5b2kedm94at70gawc18z' }
 *                     status: { type: 'string', example: 'accepted' }
 *                     from: { type: 'string', example: 'Notifly' }
 *                     text: { type: 'string' }
 *                     segments: { type: 'object' }
 *                     cost: { type: 'object', nullable: true, description: 'null tant que non tarifé' }
 *       400:
 *         description: Payload invalide, expéditeur manquant ou échec Bird
 */
router.post('/send', sendSmsController);

/**
 * @swagger
 * /api/sms/templates:
 *   get:
 *     summary: Lister les templates SMS disponibles
 *     description: >
 *       Catalogue des templates intégrés de Bird, avec leurs variables et leur
 *       aperçu. Utiles pour MoobilPay : `bird_payment_confirmation`,
 *       `bird_renewal_reminder`, `bird_order_confirmation`, `bird_signin_alert`.
 *     tags: [SMS]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: 'string', enum: ['transactional','marketing','authentication','service'] }
 *     responses:
 *       200:
 *         description: Liste des templates
 */
router.get('/templates', listSmsTemplatesController);

/**
 * @swagger
 * /api/sms/{id}:
 *   get:
 *     summary: Statut de livraison et coût d'un SMS
 *     description: >
 *       Retourne le statut courant (`accepted`, `sent`, `delivered`,
 *       `undelivered`, `failed`, `rejected`, `expired`), les segments facturés
 *       et le coût définitif une fois le message tarifé.
 *     tags: [SMS]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *         description: "Identifiant `sms_...` retourné à l'envoi"
 *     responses:
 *       200:
 *         description: Statut du SMS
 *       400:
 *         description: Identifiant inconnu
 */
router.get('/:id', getSmsStatusController);

module.exports = router;
