const express = require('express');
const router = express.Router();
const categorieController = require('../../controllers/admin/categorie.controller');

/**
 * @swagger
 * tags:
 *   name: Catégories
 *   description: Gestion des catégories
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Categorie:
 *       type: object
 *       required:
 *         - nom
 *       properties:
 *         _id:
 *           type: string
 *         nom:
 *           type: string
 *         valide:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
/**
 * @swagger
 * /categorie/insert-multiple:
 *   post:
 *     summary: Créer plusieurs catégories à la fois
 *     tags: [Catégories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - nom
 *               properties:
 *                 nom:
 *                   type: string
 *                   description: Nom de la catégorie
 *                   example: "Électronique"
 *                 valide:
 *                   type: boolean
 *                   description: Statut de la catégorie
 *                   example: true
 *           examples:
 *             trois_categories:
 *               summary: Trois catégories d'exemple
 *               value: [
 *                 { "nom": "Électronique", "valide": true },
 *                 { "nom": "Vêtements", "valide": true },
 *                 { "nom": "Alimentaire", "valide": false }
 *               ]
 *             cinq_categories:
 *               summary: Cinq catégories avec différents statuts
 *               value: [
 *                 { "nom": "Livres" },
 *                 { "nom": "Sport", "valide": true },
 *                 { "nom": "Beauté", "valide": false },
 *                 { "nom": "Jouets", "valide": true },
 *                 { "nom": "Vêtements", "valide": true },
 *                 { "nom": "Informatique", "valide": true }
 *               ]
 *     responses:
 *       201:
 *         description: Catégories créées avec succès
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
 *                   example: "3 catégories créées avec succès"
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Categorie'
 *       400:
 *         description: Erreur de validation
 *       500:
 *         description: Erreur serveur
 */
router.post('/insert-multiple', categorieController.createMultipleCategories);
/**
 * @swagger
 * /categorie/insert-categorie:
 *   post:
 *     summary: Créer une nouvelle catégorie
 *     tags: [Catégories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *             properties:
 *               nom:
 *                 type: string
 *                 example: "Électronique"
 *               valide:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Catégorie créée
 */
router.post('/insert-categorie', categorieController.createCategorie);

/**
 * @swagger
 * /categorie:
 *   get:
 *     summary: Récupérer toutes les catégories
 *     tags: [Catégories]
 *     responses:
 *       200:
 *         description: Liste des catégories
 */
router.get('/', categorieController.getAllCategories);

/**
 * @swagger
 * /categorie/valides:
 *   get:
 *     summary: Récupérer les catégories valides
 *     tags: [Catégories]
 *     responses:
 *       200:
 *         description: Liste des catégories valides
 */
router.get('/valides', categorieController.getCategoriesValides);

/**
 * @swagger
 * /categorie/{id}:
 *   get:
 *     summary: Récupérer une catégorie par ID
 *     tags: [Catégories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails de la catégorie
 */
router.get('/:id', categorieController.getCategorieById);

/**
 * @swagger
 * /categorie/{id}:
 *   put:
 *     summary: Mettre à jour une catégorie
 *     tags: [Catégories]
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
 *             properties:
 *               nom:
 *                 type: string
 *               valide:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Catégorie mise à jour
 */
router.put('/:id', categorieController.updateCategorie);

/**
 * @swagger
 * /categorie/{id}:
 *   delete:
 *     summary: Supprimer une catégorie
 *     tags: [Catégories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Catégorie supprimée
 */
router.delete('/:id', categorieController.deleteCategorie);

/**
 * @swagger
 * /categorie/{id}/toggle:
 *   patch:
 *     summary: Activer/Désactiver une catégorie
 *     tags: [Catégories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statut modifié
 */
router.patch('/:id/toggle', categorieController.toggleCategorieValide);

module.exports = router;