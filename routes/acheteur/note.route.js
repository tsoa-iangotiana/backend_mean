// routes/note.route.js
const express = require('express');
const router = express.Router();
const {
  noterProduit,
  noterBoutique,
  supprimerNote,
  getMaNote
} = require('../../controllers/acheteur/note.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Notes
 *   description: Gestion des notes (sans commentaires) sur les produits et boutiques
 */

// Toutes les routes de notes nécessitent une authentification
router.use(authMiddleware(['acheteur', 'boutique', 'admin']));

/**
 * @swagger
 * /notes/produit:
 *   post:
 *     summary: Noter un produit (sans commentaire)
 *     tags: [Notes]
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
 *               - note
 *             properties:
 *               produitId:
 *                 type: string
 *                 pattern: ^[0-9a-fA-F]{24}$
 *                 description: ID du produit à noter
 *                 example: "507f1f77bcf86cd799439011"
 *               note:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *                 description: Note attribuée (0-5)
 *                 example: 4
 *     responses:
 *       201:
 *         description: Note ajoutée ou mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Note ajoutée avec succès"
 *                 note:
 *                   type: number
 *                   example: 4
 *                 statistiques:
 *                   type: object
 *                   properties:
 *                     moyenne:
 *                       type: number
 *                       example: 4.2
 *                     total:
 *                       type: integer
 *                       example: 128
 *                     repartition:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           note:
 *                             type: integer
 *                             enum: [1,2,3,4,5]
 *                           count:
 *                             type: integer
 *                           pourcentage:
 *                             type: integer
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "La note doit être comprise entre 0 et 5"
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
 *                   example: "Produit non trouvé ou indisponible"
 */
router.post('/produit', noterProduit);

/**
 * @swagger
 * /notes/boutique:
 *   post:
 *     summary: Noter une boutique (sans commentaire)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - boutiqueId
 *               - note
 *             properties:
 *               boutiqueId:
 *                 type: string
 *                 pattern: ^[0-9a-fA-F]{24}$
 *                 description: ID de la boutique à noter
 *                 example: "507f1f77bcf86cd799439012"
 *               note:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *                 description: Note attribuée (0-5)
 *                 example: 5
 *     responses:
 *       201:
 *         description: Note ajoutée ou mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Note mise à jour avec succès"
 *                 note:
 *                   type: number
 *                   example: 5
 *                 statistiques:
 *                   type: object
 *                   properties:
 *                     moyenne:
 *                       type: number
 *                       example: 4.5
 *                     total:
 *                       type: integer
 *                       example: 56
 *                     repartition:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RepartitionNotes'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Boutique non trouvée
 */
router.post('/boutique', noterBoutique);

/**
 * @swagger
 * /notes/ma-note:
 *   get:
 *     summary: Obtenir ma note pour un produit ou une boutique
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cible_type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [PRODUIT, BOUTIQUE]
 *         description: Type de cible (produit ou boutique)
 *       - in: query
 *         name: cible_id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID de la cible
 *     responses:
 *       200:
 *         description: Ma note pour la cible
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 a_note:
 *                   type: boolean
 *                   description: Indique si l'utilisateur a déjà noté
 *                   example: true
 *                 note:
 *                   type: number
 *                   nullable: true
 *                   description: La note attribuée (si existante)
 *                   example: 4
 *                 avis_id:
 *                   type: string
 *                   nullable: true
 *                   description: ID de l'avis (si existant)
 *                   example: "507f1f77bcf86cd799439013"
 *       400:
 *         description: Paramètres invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Type et ID de la cible requis"
 *       401:
 *         description: Non authentifié
 */
router.get('/ma-note', getMaNote);

/**
 * @swagger
 * /notes/{id}:
 *   delete:
 *     summary: Supprimer sa note (uniquement la note)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID de la note à supprimer
 *     responses:
 *       200:
 *         description: Note supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Note supprimée avec succès"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès interdit (pas le propriétaire)
 *       404:
 *         description: Note non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Note non trouvée"
 */
router.delete('/:id', supprimerNote);

/**
 * @swagger
 * components:
 *   schemas:
 *     RepartitionNotes:
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           note:
 *             type: integer
 *             enum: [1, 2, 3, 4, 5]
 *           count:
 *             type: integer
 *             example: 42
 *           pourcentage:
 *             type: integer
 *             example: 33
 *     
 *     StatistiquesNotes:
 *       type: object
 *       properties:
 *         moyenne:
 *           type: number
 *           example: 4.2
 *         total:
 *           type: integer
 *           example: 128
 *         repartition:
 *           $ref: '#/components/schemas/RepartitionNotes'
 *   
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

module.exports = router;