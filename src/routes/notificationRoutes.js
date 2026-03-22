const express = require('express');
const { sendPushNotificationController } = require('../controllers/notifications/FCM/sendPushNotification.controller');
const { postNotificationController } = require('../controllers/notifications/request/postNotification.controller');
const { getNotificationsController } = require('../controllers/notifications/request/getNotifications.controller');
const { getNotificationController } = require('../controllers/notifications/request/getNotification.controller');
const { markNotificationAsReadController } = require('../controllers/notifications/request/markNotificationAsRead.controller');

const router = express.Router();

/**
 * @swagger
 * /api/notification:
 *   post:
 *     summary: Envoyer une notification push FCM
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, title, body]
 *             properties:
 *               token: { type: 'string', description: 'Token FCM du destinataire' }
 *               title: { type: 'string', description: 'Titre de la notification' }
 *               body: { type: 'string', description: 'Corps du message' }
 *               data: { type: 'object', description: 'Données additionnelles' }
 *     responses:
 *       200:
 *         description: Notification push envoyée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('', sendPushNotificationController);

/**
 * @swagger
 * /api/notification/add:
 *   post:
 *     summary: Ajouter une notification dans Firestore
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, title, body, type]
 *             properties:
 *               userId: { type: 'string', description: 'ID utilisateur destinataire' }
 *               title: { type: 'string' }
 *               body: { type: 'string' }
 *               type: { type: 'string', enum: ['info', 'success', 'warning', 'error'] }
 *               idGroup: { type: 'string', description: 'Groupe de notifications (optionnel)' }
 *     responses:
 *       200:
 *         description: Notification enregistrée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/add', postNotificationController);

/**
 * @swagger
 * /api/notification/get:
 *   get:
 *     summary: Récupérer une notification spécifique
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails de la notification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', example: true }
 *                 data: { $ref: '#/components/schemas/Notification' }
 */
router.get('/get', getNotificationController);

/**
 * @swagger
 * /api/notification/user:
 *   get:
 *     summary: Récupérer toutes les notifications d'un utilisateur
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des notifications pour l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean', example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Notification' }
 */
router.get('/user', getNotificationsController);

/**
 * @swagger
 * /api/notification/markAsRead:
 *   put:
 *     summary: Marquer une notification comme lue
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, notificationId, notificationIdGroup]
 *             properties:
 *               userId: { type: 'string' }
 *               notificationId: { type: 'string' }
 *               notificationIdGroup: { type: 'string' }
 *     responses:
 *       200:
 *         description: Notification marquée comme lue
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.put('/markAsRead', markNotificationAsReadController);

module.exports = router;
