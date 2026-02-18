const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { createBox, getAllBox, updateBox, deleteBox } = require('../../controllers/admin/box.controller');
const swaggerJSDoc = require('swagger-jsdoc');

/**
 * @swagger
 * /box/insert-box:
 *   post:
 *     summary: Créer un nouveau box
 *     tags: [Boxes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - numero
 *               - surface
 *               - prix_loyer
 *             properties:
 *               numero:
 *                 type: string
 *                 example: "A001"
 *               surface:
 *                 type: number
 *                 example: 25.5
 *               prix_loyer:
 *                 type: number
 *                 example: 450.00
 *     responses:
 *       201:
 *         description: Box créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Erreur de validation
 *       500:
 *         description: Erreur serveur
 */
router.post('/insert-box', createBox);

/**
 * @swagger
/boxes:
 *   get:
 *     summary: Récupérer tous les boxes
 */

router.get('/boxes', getAllBox);  

module.exports = router;