const express = require('express');
const router = express.Router();
const netflixPlanController = require('../controllers/netflixPlanController');

/**
 * @swagger
 * /api/netflix/plans:
 *   get:
 *     summary: Récupérer tous les plans Netflix disponibles
 *     tags: [Netflix Plans]
 *     responses:
 *       200:
 *         description: Liste des plans
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
 *                     $ref: '#/components/schemas/NetflixPlan'
 */
router.get('/', netflixPlanController.getAllPlans);

/**
 * @swagger
 * /api/netflix/plans/{id}:
 *   get:
 *     summary: Récupérer un plan spécifique par son ID
 *     tags: [Netflix Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du plan (ex. premium, mobile, basic, standard)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails du plan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/NetflixPlan'
 */
router.get('/:id', netflixPlanController.getPlanById);

/**
 * @swagger
 * /api/netflix/plans:
 *   post:
 *     summary: Créer un nouveau plan Netflix
 *     tags: [Netflix Plans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NetflixPlan'
 *     responses:
 *       201:
 *         description: Plan créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/', netflixPlanController.createPlan);

/**
 * @swagger
 * /api/netflix/plans/{id}:
 *   put:
 *     summary: Mettre à jour un plan Netflix (données partielles acceptées)
 *     tags: [Netflix Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du plan
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Mettra à jour les champs fournis (price, active, etc.)
 *     responses:
 *       200:
 *         description: Plan mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.put('/:id', netflixPlanController.updatePlan);

/**
 * @swagger
 * /api/netflix/plans/{id}:
 *   delete:
 *     summary: Supprimer un plan Netflix
 *     tags: [Netflix Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du plan
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plan supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/:id', netflixPlanController.deletePlan);

module.exports = router;
