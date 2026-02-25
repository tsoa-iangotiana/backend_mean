const express = require('express');
const router = express.Router();
const favorisController = require('../../controllers/acheteur/favoris.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Favoris
 *   description: Gestion des favoris (produits et boutiques)
 */

// Toutes les routes nécessitent une authentification
router.use(authMiddleware(['acheteur', 'boutique', 'admin']));

/**
 * @swagger
 * /favoris:
 *   get:
 *     summary: Récupérer tous les favoris de l'utilisateur connecté
 *     tags: [Favoris]
 *     responses:
 *       200:
 *         description: Liste des favoris
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 favoris:
 *                   type: object
 *                   properties:
 *                     produits:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Produit'
 *                     boutiques:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Boutique'
 *       401:
 *         description: Non authentifié
 */
router.get('/', favorisController.getFavoris);

/**
 * @swagger
 * /favoris/boutique/{boutiqueId}:
 *   post:
 *     summary: Ajouter ou retirer une boutique des favoris (toggle)
 *     tags: [Favoris]
 *     parameters:
 *       - in: path
 *         name: boutiqueId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 estFavoris:
 *                   type: boolean
 *                 boutique:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     nom:
 *                       type: string
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Boutique non trouvée
 */
router.post('/boutique/:boutiqueId', favorisController.toggleBoutiqueFavoris);

/**
 * @swagger
 * /favoris/produit/{produitId}:
 *   post:
 *     summary: Ajouter ou retirer un produit des favoris (toggle)
 *     tags: [Favoris]
 *     parameters:
 *       - in: path
 *         name: produitId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du produit
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Produit non trouvé
 */
router.post('/produit/:produitId', favorisController.toggleProduitFavoris);

/**
 * @swagger
 * /favoris/check/boutique/{boutiqueId}:
 *   get:
 *     summary: Vérifier si une boutique est en favoris
 *     tags: [Favoris]
 *     parameters:
 *       - in: path
 *         name: boutiqueId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Résultat de la vérification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 estFavoris:
 *                   type: boolean
 */
router.get('/check/boutique/:boutiqueId', favorisController.checkBoutiqueFavoris);

/**
 * @swagger
 * /favoris/check/produit/{produitId}:
 *   get:
 *     summary: Vérifier si un produit est en favoris
 *     tags: [Favoris]
 *     parameters:
 *       - in: path
 *         name: produitId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Résultat de la vérification
 */
router.get('/check/produit/:produitId', favorisController.checkProduitFavoris);

/**
 * @swagger
 * /favoris:
 *   delete:
 *     summary: Supprimer tous les favoris de l'utilisateur
 *     tags: [Favoris]
 *     responses:
 *       200:
 *         description: Favoris effacés
 */
router.delete('/', favorisController.clearFavoris);

module.exports = router;