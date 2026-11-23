const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pageController");

/**
 * @swagger
 * /page/snapshot:
 *   post:
 *     summary: Sauvegarder un snapshot de la page
 *     tags:
 *       - Page
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si X-Session-Id)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               folderName:
 *                 type: string
 *                 description: Nom du sous-dossier
 *               folder_name:
 *                 type: string
 *                 description: Alias pour folderName
 *               prefix:
 *                 type: string
 *                 description: Préfixe des fichiers (défaut snapshot)
 *               directory:
 *                 type: string
 *                 description: Répertoire personnalisé
 *     responses:
 *       200:
 *         description: Snapshot sauvegardé
 *       400:
 *         description: ID de session manquant
 */
router.post("/page/snapshot", pageController.saveSnapshot);

/**
 * @swagger
 * /page/snapshot/download/{folderName}:
 *   get:
 *     summary: Télécharger les fichiers d'un snapshot
 *     tags:
 *       - Page
 *     parameters:
 *       - in: path
 *         name: folderName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du dossier snapshot
 *       - in: query
 *         name: folderName
 *         required: false
 *         schema:
 *           type: string
 *         description: Nom du dossier (alternative)
 *       - in: query
 *         name: folder_name
 *         required: false
 *         schema:
 *           type: string
 *         description: Alias pour folderName
 *     responses:
 *       200:
 *         description: Fichiers téléchargés en ZIP
 *       400:
 *         description: Paramètres invalides
 *       404:
 *         description: Dossier non trouvé
 */
router.get("/page/snapshot/download/:folderName", pageController.downloadSnapshot);
router.get("/page/snapshot/download", pageController.downloadSnapshot);

/**
 * @swagger
 * /page/snapshot:
 *   delete:
 *     summary: Supprimer un dossier de snapshot
 *     tags:
 *       - Page
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - folderName
 *             properties:
 *               folderName:
 *                 type: string
 *                 description: Nom du dossier à supprimer
 *     responses:
 *       200:
 *         description: Snapshot supprimé
 *       400:
 *         description: Paramètres invalides
 *       404:
 *         description: Dossier non trouvé
 */
router.delete("/page/snapshot", pageController.deleteSnapshot);

/**
 * @swagger
 * /page/clickBtn:
 *   post:
 *     summary: Cliquer sur un bouton
 *     tags:
 *       - Page
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si dans body ou X-Session-Id)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buttonSelector
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: ID de la session
 *               buttonSelector:
 *                 type: string
 *                 description: Sélecteur CSS du bouton
 *     responses:
 *       200:
 *         description: Bouton cliqué
 *       400:
 *         description: Paramètres manquants
 *       404:
 *         description: Session ou bouton non trouvé
 */
router.post("/page/clickBtn", pageController.clickBtn);

/**
 * @swagger
 * /page/selectPlan:
 *   post:
 *     summary: Sélectionner un plan Netflix
 *     tags:
 *       - Page
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si dans body ou X-Session-Id)
 *       - in: query
 *         name: planSelector
 *         required: false
 *         schema:
 *           type: string
 *         description: Sélecteur CSS du plan (optionnel si dans body)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planSelector
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: ID de la session
 *               planSelector:
 *                 type: string
 *                 description: Sélecteur CSS du plan Netflix
 *     responses:
 *       200:
 *         description: Plan sélectionné
 *       400:
 *         description: Paramètres manquants
 *       404:
 *         description: Session non trouvée
 */
router.post("/page/selectPlan", pageController.selectPlan);

/**
 * @swagger
 * /form/fill:
 *   post:
 *     summary: Remplir un formulaire
 *     tags:
 *       - Form
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si dans body ou X-Session-Id)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fields
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: ID de la session
 *               fields:
 *                 type: array
 *                 description: Tableau de champs à remplir
 *                 items:
 *                   type: object
 *                   properties:
 *                     selector:
 *                       type: string
 *                       description: Sélecteur CSS du champ
 *                     value:
 *                       type: string
 *                       description: Valeur à entrer
 *                     type:
 *                       type: string
 *                       enum: [input, select, textarea]
 *                       description: Type de champ
 *     responses:
 *       200:
 *         description: Formulaire rempli
 *       400:
 *         description: Paramètres manquants ou invalides
 *       404:
 *         description: Session non trouvée
 */
router.post("/form/fill", pageController.fillForm);

/**
 * @swagger
 * /payment/form/fill:
 *   post:
 *     summary: Remplir le formulaire de paiement
 *     tags:
 *       - Payment
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si dans body ou X-Session-Id)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fields
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: ID de la session
 *               fields:
 *                 type: array
 *                 description: Tableau de champs de paiement à remplir
 *                 items:
 *                   type: object
 *                   required:
 *                     - selector
 *                     - value
 *                   properties:
 *                     selector:
 *                       type: string
 *                       description: Sélecteur CSS du champ
 *                     value:
 *                       type: string
 *                       description: Valeur à entrer
 *     responses:
 *       200:
 *         description: Formulaire de paiement rempli
 *       400:
 *         description: Paramètres manquants ou invalides
 *       404:
 *         description: Session non trouvée
 */
router.post("/payment/form/fill", pageController.fillPaymentForm);

/**
 * @swagger
 * /payment/select:
 *   post:
 *     summary: Sélectionner une méthode de paiement
 *     tags:
 *       - Payment
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si dans body ou X-Session-Id)
 *       - in: query
 *         name: selector
 *         required: false
 *         schema:
 *           type: string
 *         description: Sélecteur CSS (optionnel si dans body)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - selector
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: ID de la session
 *               selector:
 *                 type: string
 *                 description: Sélecteur CSS de la méthode de paiement
 *     responses:
 *       200:
 *         description: Méthode de paiement sélectionnée
 *       400:
 *         description: Paramètres manquants
 *       404:
 *         description: Session non trouvée
 */
router.post("/payment/select", pageController.selectPaymentMethod);

/**
 * @swagger
 * /page/current:
 *   get:
 *     summary: Obtenir les informations de la page actuelle
 *     tags:
 *       - Page
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si X-Session-Id)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête
 *     responses:
 *       200:
 *         description: Informations de la page
 *       400:
 *         description: ID de session manquant
 *       404:
 *         description: Session non trouvée
 *   post:
 *     summary: Obtenir les informations de la page actuelle
 *     tags:
 *       - Page
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si X-Session-Id)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: ID de la session
 *     responses:
 *       200:
 *         description: Informations de la page
 *       400:
 *         description: ID de session manquant
 *       404:
 *         description: Session non trouvée
 */
router.get("/page/current", pageController.getCurrentPage);
router.post("/page/current", pageController.getCurrentPage);

/**
 * @swagger
 * /page/back:
 *   post:
 *     summary: Revenir en arrière
 *     tags:
 *       - Page
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session (optionnel si X-Session-Id)
 *       - in: header
 *         name: X-Session-Id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la session via en-tête
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: ID de la session
 *     responses:
 *       200:
 *         description: Retour effectué
 *       400:
 *         description: ID de session manquant
 *       404:
 *         description: Session non trouvée
 */
router.post("/page/back", pageController.goBack);

module.exports = router;
