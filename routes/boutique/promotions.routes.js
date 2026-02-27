const express = require('express');
const router = express.Router();
const {
  createPromotion,
  getPromotions,
  updatePromotion,
  deletePromotion,
  getPromotionsActives,
  getPromotionById,
  addProduitsToPromotion,
  removeProduitsFromPromotion
} = require('../../controllers/boutique/promotions.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { estBoutique, verifierPaiement } = require('../../middlewares/boutique.middleware');

// Toutes les routes nécessitent authentification boutique et paiement valide
router.use(authMiddleware(['boutique','acheteur']));

/**
 * @swagger
 * tags:
 *   name: Promotions
 *   description: Gestion des promotions de la boutique
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Promotion:
 *       type: object
 *       required:
 *         - produits
 *         - reduction
 *       properties:
 *         _id:
 *           type: string
 *           description: ID auto-généré de la promotion
 *         produits:
 *           type: array
 *           items:
 *             type: string
 *           description: IDs des produits concernés
 *         reduction:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           description: Pourcentage de réduction
 *         date_debut:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Date de début (null = immédiate)
 *         date_fin:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Date de fin (null = permanente)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         produits: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *         reduction: 20
 *         date_debut: "2024-01-01"
 *         date_fin: "2024-12-31"
 */

/**
 * @swagger
 * /promotion:
 *   post:
 *     summary: Créer une nouvelle promotion
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - produits
 *               - reduction
 *             properties:
 *               produits:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs des produits à promouvoir
 *               reduction:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100
 *                 description: Pourcentage de réduction
 *               date_debut:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 description: Date de début (optionnel)
 *               date_fin:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 description: Date de fin (optionnel)
 *             example:
 *               produits: ["507f1f77bcf86cd799439011"]
 *               reduction: 15
 *               date_debut: "2024-01-01"
 *               date_fin: "2024-01-31"
 *     responses:
 *       201:
 *         description: Promotion créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Promotion'
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Certains produits n'existent pas
 *       500:
 *         description: Erreur serveur
 */
router.route('/')
  .post(createPromotion)
  .get(getPromotions);

/**
 * @swagger
 * /api/boutique/promotions:
 *   get:
 *     summary: Liste toutes les promotions
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des promotions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Promotion'
 *       500:
 *         description: Erreur serveur
 */

/**
 * @swagger
 * /api/boutique/promotions/actives:
 *   get:
 *     summary: Liste les promotions actives (en cours)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des promotions actives
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Promotion'
 *       500:
 *         description: Erreur serveur
 */
router.get('/actives', getPromotionsActives);

/**
 * @swagger
 * /api/boutique/promotions/{id}:
 *   get:
 *     summary: Obtenir une promotion par son ID
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la promotion
 *     responses:
 *       200:
 *         description: Détails de la promotion
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Promotion'
 *       404:
 *         description: Promotion non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', getPromotionById);

/**
 * @swagger
 * /api/boutique/promotions/{id}:
 *   put:
 *     summary: Modifier une promotion
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la promotion
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reduction:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100
 *                 description: Nouveau pourcentage de réduction
 *               date_debut:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 description: Nouvelle date de début
 *               date_fin:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 description: Nouvelle date de fin
 *             example:
 *               reduction: 25
 *               date_debut: "2024-02-01"
 *               date_fin: "2024-02-28"
 *     responses:
 *       200:
 *         description: Promotion modifiée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Promotion'
 *       404:
 *         description: Promotion non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.route('/:id')
  .put(updatePromotion)
  .delete(deletePromotion);

/**
 * @swagger
 * /api/boutique/promotions/{id}:
 *   delete:
 *     summary: Supprimer une promotion
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la promotion
 *     responses:
 *       200:
 *         description: Promotion supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Promotion supprimée avec succès
 *       404:
 *         description: Promotion non trouvée
 *       500:
 *         description: Erreur serveur
 */

/**
 * @swagger
 * /api/boutique/promotions/{id}/produits:
 *   post:
 *     summary: Ajouter des produits à une promotion
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la promotion
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - produits
 *             properties:
 *               produits:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs des produits à ajouter
 *             example:
 *               produits: ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"]
 *     responses:
 *       200:
 *         description: Produits ajoutés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Promotion'
 *       404:
 *         description: Promotion ou produits non trouvés
 *       500:
 *         description: Erreur serveur
 */
router.post('/:id/produits', addProduitsToPromotion);

/**
 * @swagger
 * /api/boutique/promotions/{id}/produits:
 *   delete:
 *     summary: Retirer des produits d'une promotion
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la promotion
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - produits
 *             properties:
 *               produits:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs des produits à retirer
 *             example:
 *               produits: ["507f1f77bcf86cd799439011"]
 *     responses:
 *       200:
 *         description: Produits retirés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Promotion'
 *       404:
 *         description: Promotion non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id/produits', removeProduitsFromPromotion);

module.exports = router;