const express = require('express');
const router = express.Router();
const {
  ajouterProduit,
  supprimerProduit,
  modifierQuantite,
  getTotalPanier,
  validerPanier,
  getPanier,
  viderPanier
} = require('../../controllers/acheteur/panier.controller');

const authMiddleware = require('../../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Panier
 *   description: Gestion du panier d'achat
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProduitPanier:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *         nom:
 *           type: string
 *           example: "Tomates bio"
 *         prix:
 *           type: number
 *           example: 2.99
 *         image:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/images/tomates.jpg"
 *         boutique:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: "65f1a2b3c4d5e6f7a8b9c0d2"
 *             nom:
 *               type: string
 *               example: "Ferme du Soleil"
 *     
 *     ItemPanier:
 *       type: object
 *       properties:
 *         produit:
 *           $ref: '#/components/schemas/ProduitPanier'
 *         quantite:
 *           type: integer
 *           example: 3
 *         prix_unitaire:
 *           type: number
 *           example: 2.99
 *         prix_original:
 *           type: number
 *           example: 3.50
 *         prix_total:
 *           type: number
 *           example: 8.97
 *         en_promotion:
 *           type: boolean
 *           example: true
 *         reduction:
 *           type: integer
 *           example: 15
 *         stock_disponible:
 *           type: integer
 *           example: 50
 *     
 *     Panier:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d3"
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ItemPanier'
 *         total:
 *           type: number
 *           example: 29.99
 *         total_original:
 *           type: number
 *           example: 34.99
 *         total_economies:
 *           type: number
 *           example: 5.00
 *         nombre_articles:
 *           type: integer
 *           example: 5
 *         nombre_produits_uniques:
 *           type: integer
 *           example: 3
 *     
 *     CommandeCreee:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d4"
 *         boutique:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d2"
 *         montant_total:
 *           type: number
 *           example: 29.99
 *         statut:
 *           type: string
 *           enum: [EN_ATTENTE, PAYEE, LIVREE, ANNULEE]
 *           example: "EN_ATTENTE"
 */

// Toutes les routes du panier nécessitent une authentification
router.use(authMiddleware(['acheteur']));

/**
 * @swagger
 * /acheteur/panier:
 *   get:
 *     summary: Obtenir le contenu complet du panier
 *     tags: [Panier]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Panier récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Panier'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur lors de la récupération du panier"
 */
router.get('/', getPanier);

/**
 * @swagger
 * /acheteur/panier/totalPanier:
 *   get:
 *     summary: Obtenir le total du panier
 *     tags: [Panier]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total calculé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   example: 29.99
 *                 total_original:
 *                   type: number
 *                   example: 34.99
 *                 total_economies:
 *                   type: number
 *                   example: 5.00
 *                 nombre_articles:
 *                   type: integer
 *                   example: 5
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       produit:
 *                         type: string
 *                         example: "Tomates bio"
 *                       quantite:
 *                         type: integer
 *                         example: 2
 *                       prix_unitaire:
 *                         type: number
 *                         example: 2.99
 *                       prix_total:
 *                         type: number
 *                         example: 5.98
 *                       en_promotion:
 *                         type: boolean
 *                         example: true
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur lors du calcul du total"
 */
router.get('/totalPanier', getTotalPanier);

/**
 * @swagger
 * /acheteur/panier/ajouterProduitPanier:
 *   post:
 *     summary: Ajouter un produit au panier
 *     tags: [Panier]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - produitId
 *             properties:
 *               produitId:
 *                 type: string
 *                 description: ID du produit à ajouter
 *                 example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *               quantite:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 example: 2
 *     responses:
 *       201:
 *         description: Produit ajouté au panier avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Produit ajouté au panier avec succès"
 *                 panier:
 *                   $ref: '#/components/schemas/Panier'
 *       400:
 *         description: Données invalides ou stock insuffisant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stock insuffisant. Disponible: 10"
 *                 stock_disponible:
 *                   type: integer
 *                   example: 10
 *       404:
 *         description: Produit non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Produit non trouvé ou indisponible"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur lors de l'ajout au panier"
 */
router.post('/ajouterProduitPanier', ajouterProduit);

/**
 * @swagger
 * /acheteur/panier/modifierQuantite:
 *   put:
 *     summary: Modifier la quantité d'un produit
 *     tags: [Panier]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - produitId
 *               - quantite
 *             properties:
 *               produitId:
 *                 type: string
 *                 description: ID du produit à modifier
 *                 example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *               quantite:
 *                 type: integer
 *                 description: Nouvelle quantité
 *                 minimum: 1
 *                 example: 3
 *     responses:
 *       200:
 *         description: Quantité modifiée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Quantité modifiée avec succès"
 *                 panier:
 *                   $ref: '#/components/schemas/Panier'
 *       400:
 *         description: Données invalides ou stock insuffisant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stock insuffisant. Maximum: 5"
 *                 stock_disponible:
 *                   type: integer
 *                   example: 5
 *       404:
 *         description: Produit ou panier non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Produit non trouvé dans le panier"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur lors de la modification de la quantité"
 */
router.put('/modifierQuantite', modifierQuantite);

/**
 * @swagger
 * /acheteur/panier/supprimer/{produitId}:
 *   delete:
 *     summary: Supprimer un produit du panier
 *     tags: [Panier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: produitId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du produit à supprimer
 *         example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *     responses:
 *       200:
 *         description: Produit supprimé du panier
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Produit supprimé du panier"
 *                 panier:
 *                   $ref: '#/components/schemas/Panier'
 *       404:
 *         description: Panier non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Panier non trouvé"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur lors de la suppression du produit"
 */
router.delete('/supprimer/:produitId', supprimerProduit);

/**
 * @swagger
 * /acheteur/panier/vider:
 *   delete:
 *     summary: Vider complètement le panier
 *     tags: [Panier]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Panier vidé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Panier vidé avec succès"
 *                 panier:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       example: []
 *                     total:
 *                       type: number
 *                       example: 0
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur lors du vidage du panier"
 */
router.delete('/vider', viderPanier);

/**
 * @swagger
 * /acheteur/panier/validerPanier:
 *   post:
 *     summary: Valider le panier et créer les commandes
 *     tags: [Panier]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Notes optionnelles pour la commande
 *                 example: "Sonner à l'interphone"
 *     responses:
 *       201:
 *         description: Commandes créées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Commandes créées avec succès"
 *                 commandes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CommandeCreee'
 *                 nombre_commandes:
 *                   type: integer
 *                   example: 2
 *                 total_global:
 *                   type: number
 *                   example: 59.98
 *       400:
 *         description: Panier vide ou produits indisponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stock insuffisant pour Tomates bio. Disponible: 2"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur lors de la validation du panier"
 */
router.post('/validerPanier', validerPanier);

module.exports = router;