const express = require('express');
const router = express.Router();
const {
  createProduit,
  getProduits,
  getProduit,
  updateProduit,
  deleteProduit,
  getSituationStock,
  updateStock
} = require('../../controllers/boutique/produits.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { estBoutique, verifierPaiement } = require('../../middlewares/boutique.middleware');

router.use(authMiddleware(['boutique']), verifierPaiement);

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
 *       properties:
 *         _id:
 *           type: string
 *           description: ID auto-généré du produit
 *         nom:
 *           type: string
 *           description: Nom du produit
 *           example: "Smartphone Samsung Galaxy"
 *         description:
 *           type: string
 *           description: Description détaillée du produit
 *           example: "Smartphone avec 128GB de stockage, écran AMOLED 6.5 pouces"
 *         prix:
 *           type: number
 *           description: Prix du produit
 *           minimum: 0
 *           example: 599.99
 *         unite:
 *           type: string
 *           enum: [unite, kg, litre, metre]
 *           default: unite
 *           description: Unité de vente du produit
 *           example: "unite"
 *         stock:
 *           type: number
 *           description: Quantité en stock
 *           minimum: 0
 *           default: 0
 *           example: 50
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: URLs des images du produit
 *           example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *         categorie:
 *           type: string
 *           description: ID de la catégorie du produit
 *           example: "5f9d7a3b9d3e2a1b3c4d5e6f"
 *         boutique:
 *           type: string
 *           description: ID de la boutique (auto-assigné)
 *         actif:
 *           type: boolean
 *           default: true
 *           description: Si le produit est actif/en vente
 *         note_moyenne:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *           default: 0
 *           description: Note moyenne du produit
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date de création
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date de dernière mise à jour
 *     
 *     ProduitInput:
 *       type: object
 *       required:
 *         - nom
 *         - prix
 *         - categorie
 *       properties:
 *         nom:
 *           type: string
 *           example: "Smartphone Samsung Galaxy"
 *         description:
 *           type: string
 *           example: "Smartphone avec 128GB de stockage"
 *         prix:
 *           type: number
 *           example: 599.99
 *         unite:
 *           type: string
 *           enum: [unite, kg, litre, metre]
 *           default: unite
 *         stock:
 *           type: number
 *           default: 0
 *           example: 50
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://example.com/image1.jpg"]
 *         categorie:
 *           type: string
 *           example: "5f9d7a3b9d3e2a1b3c4d5e6f"
 *         actif:
 *           type: boolean
 *           default: true
 *     
 *     ProduitsBulkInput:
 *       type: object
 *       required:
 *         - produits
 *       properties:
 *         produits:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProduitInput'
 *           example:
 *             - nom: "Smartphone Samsung"
 *               prix: 599.99
 *               categorie: "5f9d7a3b9d3e2a1b3c4d5e6f"
 *               stock: 50
 *               images: ["https://example.com/samsung.jpg"]
 *             - nom: "iPhone 13"
 *               prix: 899.99
 *               categorie: "5f9d7a3b9d3e2a1b3c4d5e6f"
 *               stock: 30
 *               images: ["https://example.com/iphone.jpg"]
 *     
 *     SituationStock:
 *       type: object
 *       properties:
 *         produit_id:
 *           type: string
 *           example: "5f9d7a3b9d3e2a1b3c4d5e6f"
 *         nom:
 *           type: string
 *           example: "Smartphone Samsung"
 *         stock_actuel:
 *           type: number
 *           example: 5
 *         unite:
 *           type: string
 *           example: "unite"
 *         alerte_stock:
 *           type: boolean
 *           example: true
 *         seuil_alerte:
 *           type: number
 *           example: 10
 *         statut:
 *           type: string
 *           enum: [RUPTURE, FAIBLE, NORMAL]
 *           example: "FAIBLE"
 *     
 *     StockUpdate:
 *       type: object
 *       required:
 *         - quantite
 *       properties:
 *         quantite:
 *           type: number
 *           description: Quantité à ajouter/soustraire/définir
 *           example: 10
 *         operation:
 *           type: string
 *           enum: [SET, ADD, SUBTRACT]
 *           default: SET
 *           description: Type d'opération sur le stock
 *           example: "ADD"
 *     
 *     Pagination:
 *       type: object
 *       properties:
 *         produits:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Produit'
 *         totalPages:
 *           type: integer
 *           example: 5
 *         currentPage:
 *           type: integer
 *           example: 1
 *         total:
 *           type: integer
 *           example: 100
 */

/**
 * @swagger
 * /boutique/produits:
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
 *             properties:
 *               produits:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ProduitInput'
 *           examples:
 *             multiple:
 *               summary: Création multiple
 *               value:
 *                 produits: [
 *                   {
 *                     "nom": "Smartphone Samsung",
 *                     "prix": 599.99,
 *                     "categorie": "5f9d7a3b9d3e2a1b3c4d5e6f",
 *                     "stock": 50,
 *                     "images": ["https://example.com/samsung.jpg"]
 *                   },
 *                   {
 *                     "nom": "iPhone 13",
 *                     "prix": 899.99,
 *                     "categorie": "5f9d7a3b9d3e2a1b3c4d5e6f",
 *                     "stock": 30,
 *                     "images": ["https://example.com/iphone.jpg"]
 *                   }
 *                 ]
 *             single:
 *               summary: Création simple
 *               value:
 *                 produits: [
 *                   {
 *                     "nom": "Smartphone Samsung",
 *                     "prix": 599.99,
 *                     "categorie": "5f9d7a3b9d3e2a1b3c4d5e6f"
 *                   }
 *                 ]
 *     responses:
 *       201:
 *         description: Produit(s) créé(s) avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "2 produit(s) ajouté(s)"
 *                 produits:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Produit'
 *       400:
 *         description: Format de données invalide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Format: tableau de produits requis"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé - Boutique non autorisée
 *       500:
 *         description: Erreur serveur
 */
router.post('/', createProduit);

/**
 * @swagger
 * /boutique/produits:
 *   get:
 *     summary: Récupérer tous les produits de la boutique
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: actif
 *         schema:
 *           type: boolean
 *         description: Filtrer par statut actif/inactif
 *         example: true
 *       - in: query
 *         name: categorie
 *         schema:
 *           type: string
 *         description: Filtrer par ID de catégorie
 *         example: "5f9d7a3b9d3e2a1b3c4d5e6f"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Rechercher par nom (recherche insensible à la casse)
 *         example: "samsung"
 *     responses:
 *       200:
 *         description: Liste paginée des produits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 produits:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Produit'
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 total:
 *                   type: integer
 *                   example: 100
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/', getProduits);

/**
 * @swagger
 * /boutique/produits/{id}:
 *   get:
 *     summary: Récupérer un produit par son ID
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du produit
 *         example: "5f9d7a3b9d3e2a1b3c4d5e6f"
 *     responses:
 *       200:
 *         description: Détails du produit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Produit'
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Produit non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Produit non trouvé"
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', getProduit);

/**
 * @swagger
 * /boutique/produits/{id}:
 *   put:
 *     summary: Mettre à jour un produit
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du produit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProduitInput'
 *           example:
 *             nom: "Smartphone Samsung Galaxy S21"
 *             description: "Modèle mis à jour avec plus de mémoire"
 *             prix: 649.99
 *             unite: "unite"
 *             stock: 45
 *             images: ["https://example.com/samsung-s21.jpg"]
 *             categorie: "5f9d7a3b9d3e2a1b3c4d5e6f"
 *             actif: true
 *     responses:
 *       200:
 *         description: Produit mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Produit'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', updateProduit);

/**
 * @swagger
 * /boutique/produits/{id}:
 *   delete:
 *     summary: Supprimer un produit
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du produit
 *     responses:
 *       200:
 *         description: Produit supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Produit supprimé avec succès"
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', deleteProduit);

/**
 * @swagger
 * /boutique/produits/{id}/stock:
 *   get:
 *     summary: Obtenir la situation de stock d'un produit
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du produit
 *     responses:
 *       200:
 *         description: Situation de stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 produit_id:
 *                   type: string
 *                   example: "5f9d7a3b9d3e2a1b3c4d5e6f"
 *                 nom:
 *                   type: string
 *                   example: "Smartphone Samsung"
 *                 stock_actuel:
 *                   type: number
 *                   example: 5
 *                 unite:
 *                   type: string
 *                   example: "unite"
 *                 alerte_stock:
 *                   type: boolean
 *                   example: true
 *                 seuil_alerte:
 *                   type: number
 *                   example: 10
 *                 statut:
 *                   type: string
 *                   enum: [RUPTURE, FAIBLE, NORMAL]
 *                   example: "FAIBLE"
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id/stock', getSituationStock);

/**
 * @swagger
 * /boutique/produits/{id}/stock:
 *   put:
 *     summary: Mettre à jour le stock d'un produit
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du produit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantite
 *             properties:
 *               quantite:
 *                 type: number
 *                 description: Quantité à ajouter/soustraire/définir
 *                 example: 10
 *               operation:
 *                 type: string
 *                 enum: [SET, ADD, SUBTRACT]
 *                 default: SET
 *                 description: Type d'opération sur le stock
 *                 example: "ADD"
 *           examples:
 *             add:
 *               summary: Ajouter du stock
 *               value:
 *                 quantite: 10
 *                 operation: "ADD"
 *             subtract:
 *               summary: Retirer du stock
 *               value:
 *                 quantite: 5
 *                 operation: "SUBTRACT"
 *             set:
 *               summary: Définir le stock exact
 *               value:
 *                 quantite: 100
 *                 operation: "SET"
 *     responses:
 *       200:
 *         description: Stock mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stock mis à jour"
 *                 produit:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     nom:
 *                       type: string
 *                     stock:
 *                       type: number
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Quantité requise"
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Produit non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id/stock', updateStock);

module.exports = router;