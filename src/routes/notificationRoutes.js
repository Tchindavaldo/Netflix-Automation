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
 *     summary: Send a push notification
 *     tags:
 *       - Notifications
 */
router.post('', sendPushNotificationController);

/**
 * @swagger
 * /api/notification/add:
 *   post:
 *     summary: Add a notification to database
 *     tags:
 *       - Notifications
 */
router.post('/add', postNotificationController);

/**
 * @swagger
 * /api/notification/get:
 *   get:
 *     summary: Get a specific notification
 *     tags:
 *       - Notifications
 */
router.get('/get', getNotificationController);

/**
 * @swagger
 * /api/notification/user:
 *   get:
 *     summary: Get all notifications for a user
 *     tags:
 *       - Notifications
 */
router.get('/user', getNotificationsController);

/**
 * @swagger
 * /api/notification/markAsRead:
 *   put:
 *     summary: Mark a notification as read
 *     tags:
 *       - Notifications
 */
router.put('/markAsRead', markNotificationAsReadController);

module.exports = router;
