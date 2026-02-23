// routes/avis.route.js
const express = require('express');
const router = express.Router();
const {
  donnerAvisProduit,
  donnerAvisBoutique,
  getAvisProduit,
  getAvisBoutique,
  modifierAvis,
  supprimerAvis,
  signalerAvis
} = require('../../controllers/acheteur/avis.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Avis
 *   description: Gestion des avis sur les produits et boutiques
 */

// ==================== ROUTES PUBLIQUES ====================

/**
 * @swagger
 * /avis/produit/{produitId}:
 *   get:
 *     summary: Récupérer les avis d'un produit
 *     tags: [Avis]
 *     parameters:
 *       - in: path
 *         name: produitId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID du produit
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
 *           maximum: 50
 *           default: 10
 *         description: Nombre d'avis par page
 *       - in: query
 *         name: tri
 *         schema:
 *           type: string
 *           enum: [recent, ancien, note_desc, note_asc, utile]
 *           default: recent
 *         description: Type de tri des avis
 *     responses:
 *       200:
 *         description: Liste des avis du produit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 produit:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     nom:
 *                       type: string
 *                       example: "Tomates bio"
 *                     note_moyenne:
 *                       type: number
 *                       example: 4.5
 *                 avis:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       utilisateur:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                             example: "jean23"
 *                       note:
 *                         type: number
 *                         example: 5
 *                       commentaire:
 *                         type: string
 *                         example: "Excellent produit !"
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       date_formatee:
 *                         type: string
 *                         example: "Il y a 2 jours"
 *                       utile:
 *                         type: number
 *                         example: 12
 *                       deja_utile:
 *                         type: boolean
 *                         example: false
 *                 statistiques:
 *                   type: object
 *                   properties:
 *                     moyenne:
 *                       type: number
 *                       example: 4.5
 *                     total:
 *                       type: integer
 *                       example: 42
 *                     avec_commentaire:
 *                       type: integer
 *                       example: 38
 *                     repartition:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           note:
 *                             type: integer
 *                             example: 5
 *                           count:
 *                             type: integer
 *                             example: 20
 *                           pourcentage:
 *                             type: integer
 *                             example: 48
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 42
 *                     pages:
 *                       type: integer
 *                       example: 5
 *                 tri_actuel:
 *                   type: string
 *                   example: "recent"
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
 */
router.get('/produit/:produitId', getAvisProduit);

/**
 * @swagger
 * /avis/boutique/{boutiqueId}:
 *   get:
 *     summary: Récupérer les avis d'une boutique
 *     tags: [Avis]
 *     parameters:
 *       - in: path
 *         name: boutiqueId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID de la boutique
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
 *           maximum: 50
 *           default: 10
 *         description: Nombre d'avis par page
 *       - in: query
 *         name: tri
 *         schema:
 *           type: string
 *           enum: [recent, ancien, note_desc, note_asc, utile]
 *           default: recent
 *         description: Type de tri des avis
 *     responses:
 *       200:
 *         description: Liste des avis de la boutique
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 boutique:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439012"
 *                     nom:
 *                       type: string
 *                       example: "Ferme du Soleil"
 *                     note_moyenne:
 *                       type: number
 *                       example: 4.2
 *                 avis:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Avis'
 *                 statistiques:
 *                   $ref: '#/components/schemas/StatistiquesAvis'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 tri_actuel:
 *                   type: string
 *       404:
 *         description: Boutique non trouvée
 */
router.get('/boutique/:boutiqueId', getAvisBoutique);

// ==================== ROUTES PROTÉGÉES ====================

router.use(authMiddleware(['acheteur', 'boutique', 'admin']));

/**
 * @swagger
 * /avis/produit:
 *   post:
 *     summary: Donner ou mettre à jour un avis sur un produit
 *     tags: [Avis]
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
 *               commentaire:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Commentaire optionnel
 *                 example: "Produit de très bonne qualité, livraison rapide"
 *     responses:
 *       201:
 *         description: Avis ajouté ou mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Avis ajouté avec succès"
 *                 produit:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     nom:
 *                       type: string
 *                     boutique:
 *                       type: string
 *                 avis:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Avis'
 *                 statistiques:
 *                   $ref: '#/components/schemas/StatistiquesAvis'
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
 */
router.post('/produit', donnerAvisProduit);

/**
 * @swagger
 * /avis/boutique:
 *   post:
 *     summary: Donner ou mettre à jour un avis sur une boutique
 *     tags: [Avis]
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
 *               commentaire:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Commentaire optionnel
 *                 example: "Boutique très professionnelle, service client impeccable"
 *     responses:
 *       201:
 *         description: Avis ajouté ou mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Avis mis à jour avec succès"
 *                 boutique:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     nom:
 *                       type: string
 *                 avis:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Avis'
 *                 statistiques:
 *                   $ref: '#/components/schemas/StatistiquesAvis'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Boutique non trouvée
 */
router.post('/boutique', donnerAvisBoutique);

/**
 * @swagger
 * /avis/{id}:
 *   put:
 *     summary: Modifier son avis
 *     tags: [Avis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID de l'avis à modifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *                 description: Nouvelle note
 *                 example: 4
 *               commentaire:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Nouveau commentaire
 *                 example: "Après réflexion, je modifie mon avis"
 *     responses:
 *       200:
 *         description: Avis modifié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Avis modifié avec succès"
 *                 avis:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     note:
 *                       type: number
 *                     commentaire:
 *                       type: string
 *                     date_modification:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès interdit (pas le propriétaire)
 *       404:
 *         description: Avis non trouvé
 */
router.put('/:id', modifierAvis);

/**
 * @swagger
 * /avis/{id}:
 *   delete:
 *     summary: Supprimer son avis
 *     tags: [Avis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID de l'avis à supprimer
 *     responses:
 *       200:
 *         description: Avis supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Avis supprimé avec succès"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès interdit (pas le propriétaire)
 *       404:
 *         description: Avis non trouvé
 */
router.delete('/:id', supprimerAvis);

/**
 * @swagger
 * /avis/{id}/signaler:
 *   post:
 *     summary: Signaler un avis inapproprié
 *     tags: [Avis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID de l'avis à signaler
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - raison
 *             properties:
 *               raison:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Raison du signalement
 *                 example: "Contenu offensant et langage inapproprié"
 *     responses:
 *       200:
 *         description: Avis signalé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Avis signalé, merci pour votre contribution"
 *       400:
 *         description: Raison invalide
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Avis non trouvé
 */
router.post('/:id/signaler', signalerAvis);

// ==================== COMPOSANTS SWAGGER ====================

/**
 * @swagger
 * components:
 *   schemas:
 *     Avis:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "507f1f77bcf86cd799439013"
 *         utilisateur:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               example: "507f1f77bcf86cd799439014"
 *             username:
 *               type: string
 *               example: "marie.dupont"
 *         note:
 *           type: number
 *           example: 4
 *         commentaire:
 *           type: string
 *           example: "Très satisfait du produit"
 *         date:
 *           type: string
 *           format: date-time
 *         date_formatee:
 *           type: string
 *           example: "Il y a 3 jours"
 *         utile:
 *           type: number
 *           example: 5
 *         deja_utile:
 *           type: boolean
 *           example: false
 *     
 *     StatistiquesAvis:
 *       type: object
 *       properties:
 *         moyenne:
 *           type: number
 *           example: 4.3
 *         total:
 *           type: integer
 *           example: 127
 *         avec_commentaire:
 *           type: integer
 *           example: 98
 *         repartition:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               note:
 *                 type: integer
 *                 enum: [1,2,3,4,5]
 *               count:
 *                 type: integer
 *               pourcentage:
 *                 type: integer
 *     
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 2
 *         limit:
 *           type: integer
 *           example: 10
 *         total:
 *           type: integer
 *           example: 127
 *         pages:
 *           type: integer
 *           example: 13
 *     
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

module.exports = router;