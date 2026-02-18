const express = require('express');
const router = express.Router();
const boutiqueController = require('../../controllers/boutique/boutique.controller');

/**
 * @swagger
 * tags:
 *   name: Boutiques
 *   description: Gestion des boutiques
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Boutique:
 *       type: object
 *       required:
 *         - nom
 *         - responsable
 *       properties:
 *         _id:
 *           type: string
 *           description: ID auto-généré de la boutique
 *         profil_photo:
 *           type: string
 *           description: URL de la photo de profil
 *         slogan:
 *           type: string
 *           description: Slogan de la boutique
 *         condition_vente:
 *           type: string
 *           description: Conditions de vente
 *         contact:
 *           type: array
 *           items:
 *             type: string
 *           description: Liste des contacts
 *         nom:
 *           type: string
 *           description: Nom de la boutique
 *         description:
 *           type: string
 *           description: Description de la boutique
 *         box:
 *           type: string
 *           description: ID du box associé
 *         responsable:
 *           type: string
 *           description: ID du responsable
 *         active:
 *           type: boolean
 *           description: Statut d'activation
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *           description: IDs des catégories
 *         note_moyenne:
 *           type: number
 *           description: Note moyenne (0-5)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /boutique/insert:
 *   post:
 *     summary: Créer une nouvelle boutique
 *     tags: [Boutiques]
 *     description: Vérifie que le responsable n'a pas déjà une boutique
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *               - responsable
 *             properties:
 *               nom:
 *                 type: string
 *                 example: "Tech Store"
 *               responsable:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               slogan:
 *                 type: string
 *                 example: "L'électronique à prix discount"
 *               description:
 *                 type: string
 *                 example: "Vente de matériel électronique"
 *               box:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439022"
 *               contact:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["+261341234567", "tech@store.com"]
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439033", "507f1f77bcf86cd799439044"]
 *               active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Boutique créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 boutique:
 *                   $ref: '#/components/schemas/Boutique'
 *       400:
 *         description: Le responsable a déjà une boutique ou validation échouée
 *       404:
 *         description: Box, responsable ou catégorie non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/insert', boutiqueController.createBoutique);

/**
 * @swagger
 * /boutique/all:
 *   get:
 *     summary: Récupérer toutes les boutiques
 *     tags: [Boutiques]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrer par statut actif
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Rechercher par nom
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste des boutiques
 *       500:
 *         description: Erreur serveur
 */
router.get('/all', boutiqueController.getAllBoutiques);

/**
 * @swagger
 * /boutique/{id}:
 *   get:
 *     summary: Récupérer une boutique par son ID
 *     tags: [Boutiques]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *     responses:
 *       200:
 *         description: Détails de la boutique
 *       400:
 *         description: ID invalide
 *       404:
 *         description: Boutique non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', boutiqueController.getBoutiqueById);

/**
 * @swagger
 * /boutique/responsable/{responsableId}:
 *   get:
 *     summary: Récupérer la boutique d'un responsable
 *     tags: [Boutiques]
 *     parameters:
 *       - in: path
 *         name: responsableId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du responsable
 *     responses:
 *       200:
 *         description: Boutique du responsable
 *       400:
 *         description: ID invalide
 *       404:
 *         description: Aucune boutique trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get('/responsable/:responsableId', boutiqueController.getBoutiqueByResponsable);

/**
 * @swagger
 * /boutique/check-responsable/{responsableId}:
 *   get:
 *     summary: Vérifier si un responsable a déjà une boutique
 *     tags: [Boutiques]
 *     parameters:
 *       - in: path
 *         name: responsableId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du responsable
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
 *                   example: true
 *                 hasBoutique:
 *                   type: boolean
 *                   example: true
 *                 boutique:
 *                   $ref: '#/components/schemas/Boutique'
 *       400:
 *         description: ID invalide
 *       500:
 *         description: Erreur serveur
 */
router.get('/check-responsable/:responsableId', boutiqueController.checkResponsableBoutique);

/**
 * @swagger
 * /boutique/{id}:
 *   put:
 *     summary: Mettre à jour une boutique
 *     tags: [Boutiques]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *                 example: "Nouveau nom"
 *               slogan:
 *                 type: string
 *                 example: "Nouveau slogan"
 *               description:
 *                 type: string
 *               box:
 *                 type: string
 *                 nullable: true
 *               responsable:
 *                 type: string
 *               active:
 *                 type: boolean
 *               condition_vente:
 *                 type: string
 *               profil_photo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Boutique mise à jour
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Boutique non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', boutiqueController.updateBoutique);

/**
 * @swagger
 * /boutique/{id}:
 *   delete:
 *     summary: Supprimer une boutique (soft delete par défaut)
 *     tags: [Boutiques]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *       - in: query
 *         name: hardDelete
 *         schema:
 *           type: boolean
 *         description: Mettre à true pour une suppression définitive
 *     responses:
 *       200:
 *         description: Boutique supprimée/désactivée
 *       400:
 *         description: ID invalide
 *       404:
 *         description: Boutique non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', boutiqueController.deleteBoutique);

/**
 * @swagger
 * /boutique/{id}/toggle:
 *   patch:
 *     summary: Activer/Désactiver une boutique
 *     tags: [Boutiques]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *     responses:
 *       200:
 *         description: Statut modifié
 *       400:
 *         description: ID invalide
 *       404:
 *         description: Boutique non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:id/toggle', boutiqueController.toggleBoutiqueActive);

/**
 * @swagger
 * /boutique/{id}/categories:
 *   post:
 *     summary: Ajouter une catégorie à la boutique
 *     tags: [Boutiques]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categorieId
 *             properties:
 *               categorieId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439033"
 *     responses:
 *       200:
 *         description: Catégorie ajoutée
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Boutique ou catégorie non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.post('/:id/categories', boutiqueController.addCategorieToBoutique);

/**
 * @swagger
 * /boutique/{id}/categories/{categorieId}:
 *   delete:
 *     summary: Retirer une catégorie de la boutique
 *     tags: [Boutiques]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *       - in: path
 *         name: categorieId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la catégorie
 *     responses:
 *       200:
 *         description: Catégorie retirée
 *       400:
 *         description: ID invalide
 *       404:
 *         description: Boutique non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id/categories/:categorieId', boutiqueController.removeCategorieFromBoutique);

/**
 * @swagger
 * /boutique/{id}/contacts:
 *   post:
 *     summary: Ajouter un contact à la boutique
 *     tags: [Boutiques]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contact
 *             properties:
 *               contact:
 *                 type: string
 *                 example: "+261341234567"
 *     responses:
 *       200:
 *         description: Contact ajouté
 *       400:
 *         description: Contact requis
 *       404:
 *         description: Boutique non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.post('/:id/contacts', boutiqueController.addContactToBoutique);

/**
 * @swagger
 * /boutique/{id}/contacts/{index}:
 *   delete:
 *     summary: Supprimer un contact de la boutique par son index
 *     tags: [Boutiques]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *       - in: path
 *         name: index
 *         required: true
 *         schema:
 *           type: integer
 *         description: Index du contact dans le tableau
 *     responses:
 *       200:
 *         description: Contact supprimé
 *       400:
 *         description: Index invalide
 *       404:
 *         description: Boutique non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id/contacts/:index', boutiqueController.removeContactFromBoutique);

module.exports = router;