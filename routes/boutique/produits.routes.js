const express = require('express');
const router = express.Router();
const produitController = require('../../controllers/boutique/produits.controller');
const  authMiddleware  = require('../../middlewares/auth.middleware'); // Si vous avez un middleware d'auth
const Produit = require('../../models/produit.model');
/**
 * @swagger
 * tags:
 *   name: Produits
 *   description: Gestion des produits
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Produit:
 *       type: object
 *       required:
 *         - nom
 *         - prix
 *         - categorie
 *         - boutique
 *       properties:
 *         _id:
 *           type: string
 *         nom:
 *           type: string
 *         description:
 *           type: string
 *         prix:
 *           type: number
 *         unite:
 *           type: string
 *           enum: [unite, kg, litre, metre]
 *         stock:
 *           type: number
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         categorie:
 *           type: string
 *         boutique:
 *           type: string
 *         actif:
 *           type: boolean
 *         note_moyenne:
 *           type: number
 */

/**
 * @swagger
 * /produit:
 *   post:
 *     summary: Créer un ou plusieurs produits
 *     tags: [Produits]
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
 *               - boutiqueId
 *             properties:
 *               produits:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - nom
 *                     - prix
 *                     - categorie
 *                   properties:
 *                     nom:
 *                       type: string
 *                     description:
 *                       type: string
 *                     prix:
 *                       type: number
 *                     unite:
 *                       type: string
 *                       enum: [unite, kg, litre, metre]
 *                     stock:
 *                       type: number
 *                     categorie:
 *                       type: string
 *               boutiqueId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Produits créés avec succès
 *       400:
 *         description: Données invalides
 *       403:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */
router.post('/', authMiddleware(['boutique']), produitController.createProduit);

/**
 * @swagger
 * /produit:
 *   get:
 *     summary: Récupérer tous les produits d'une boutique
 *     tags: [Produits]
 *     parameters:
 *       - in: query
 *         name: boutiqueId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: actif
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: categorie
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des produits
 *       400:
 *         description: ID boutique requis
 *       500:
 *         description: Erreur serveur
 */
router.get('/',authMiddleware(['acheteur','boutique']),produitController.getProduits);

/**
 * @swagger
 * /produit/{id}:
 *   get:
 *     summary: Récupérer un produit par ID
 *     tags: [Produits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: boutiqueId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails du produit
 *       400:
 *         description: ID boutique requis
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', authMiddleware, produitController.getProduit);

/**
 * @swagger
 * /produit/{id}:
 *   put:
 *     summary: Mettre à jour un produit
 *     tags: [Produits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - boutiqueId
 *             properties:
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *               prix:
 *                 type: number
 *               unite:
 *                 type: string
 *               stock:
 *                 type: number
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               categorie:
 *                 type: string
 *               actif:
 *                 type: boolean
 *               boutiqueId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Produit mis à jour
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', authMiddleware, produitController.updateProduit);

/**
 * @swagger
 * /produit/{id}:
 *   delete:
 *     summary: Supprimer un produit
 *     tags: [Produits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: boutiqueId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Produit supprimé
 *       400:
 *         description: ID boutique requis
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', authMiddleware, produitController.deleteProduit);

/**
 * @swagger
 * /produit/{id}/stock:
 *   get:
 *     summary: Obtenir la situation de stock d'un produit
 *     tags: [Produits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: boutiqueId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Situation de stock
 *       400:
 *         description: ID boutique requis
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id/stock', authMiddleware, produitController.getSituationStock);

/**
 * @swagger
 * /produit/{id}/stock:
 *   put:
 *     summary: Mettre à jour le stock d'un produit
 *     tags: [Produits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantite
 *               - operation
 *               - boutiqueId
 *             properties:
 *               quantite:
 *                 type: number
 *               operation:
 *                 type: string
 *                 enum: [SET, ADD, SUBTRACT]
 *               boutiqueId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock mis à jour
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id/stock', authMiddleware, produitController.updateStock);

module.exports = router;