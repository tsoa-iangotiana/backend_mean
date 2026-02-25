const express = require('express');
const router = express.Router();
const  authMiddleware  = require('../../middlewares/auth.middleware');
const { 
  createBox, 
  attribuerBox,
  libererBox,
  transfererBox,
  getAllBox, 
  getBoxById,
  updateBox, 
  deleteBox,
  getBoxHistorique
} = require('../../controllers/admin/box.controller');

// Toutes les routes nécessitent une authentification admin
router.use(authMiddleware(['admin']));

/**
 * @swagger
 * tags:
 *   name: Boxes
 *   description: Gestion des box du centre commercial
 */

/**
 * @swagger
 * /box/insert-box:
 *   post:
 *     summary: Créer un nouveau box
 *     tags: [Boxes]
 *     security:
 *       - bearerAuth: []
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
 *                 description: Numéro unique du box
 *                 example: "A001"
 *               surface:
 *                 type: number
 *                 description: Surface en m²
 *                 example: 25.5
 *               prix_loyer:
 *                 type: number
 *                 description: Prix du loyer mensuel
 *                 example: 450000
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Box créé avec succès
 *                 box:
 *                   $ref: '#/components/schemas/Box'
 *       400:
 *         description: Erreur de validation ou numéro déjà existant
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès non autorisé
 *       500:
 *         description: Erreur serveur
 */
router.post('/insert-box', createBox);

/**
 * @swagger
 * /box/list:
 *   get:
 *     summary: Récupérer tous les boxes avec filtres
 *     tags: [Boxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: libre
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrer par disponibilité
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Rechercher par numéro
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
 *           default: 20
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: tri
 *         schema:
 *           type: string
 *           enum: [numero_asc, numero_desc, surface_asc, surface_desc, prix_asc, prix_desc]
 *           default: numero_asc
 *         description: Tri des résultats
 *     responses:
 *       200:
 *         description: Liste des boxes récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 boxs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BoxDetail'
 *                 statistiques:
 *                   type: object
 *                   properties:
 *                     total_box:
 *                       type: integer
 *                     box_libres:
 *                       type: integer
 *                     box_occupes:
 *                       type: integer
 *                     loyer_moyen:
 *                       type: number
 *                     surface_moyenne:
 *                       type: number
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/list', getAllBox);

/**
 * @swagger
 * /box/{boxId}:
 *   get:
 *     summary: Récupérer les détails d'un box
 *     tags: [Boxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boxId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du box
 *     responses:
 *       200:
 *         description: Détails du box récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 box:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Box'
 *                     - type: object
 *                       properties:
 *                         occupation_actuelle:
 *                           type: object
 *                           properties:
 *                             boutique:
 *                               type: object
 *                             depuis:
 *                               type: string
 *                               format: date
 *                             duree:
 *                               type: integer
 *                 historique:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BoxHistorique'
 *                 statistiques:
 *                   type: object
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Box non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:boxId', getBoxById);

/**
 * @swagger
 * /box/{boxId}/historique:
 *   get:
 *     summary: Récupérer l'historique d'occupation d'un box
 *     tags: [Boxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boxId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du box
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
 *     responses:
 *       200:
 *         description: Historique récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 historique:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       box:
 *                         type: string
 *                       boutique:
 *                         type: object
 *                       date_debut:
 *                         type: string
 *                         format: date
 *                       date_fin:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                       duree_jours:
 *                         type: integer
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/:boxId/historique', getBoxHistorique);

/**
 * @swagger
 * /box/{boxId}/attribuer:
 *   post:
 *     summary: Attribuer un box à une boutique
 *     tags: [Boxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boxId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du box
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - boutiqueId
 *             properties:
 *               boutiqueId:
 *                 type: string
 *                 description: ID de la boutique
 *               date_debut:
 *                 type: string
 *                 format: date
 *                 description: Date de début d'occupation (défaut = maintenant)
 *     responses:
 *       200:
 *         description: Box attribué avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 attribution:
 *                   type: object
 *       400:
 *         description: Box déjà occupé ou boutique déjà équipée
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Box ou boutique non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/:boxId/attribuer', attribuerBox);

/**
 * @swagger
 * /box/{boxId}/liberer:
 *   post:
 *     summary: Libérer un box (fin d'occupation)
 *     tags: [Boxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boxId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du box
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date_fin:
 *                 type: string
 *                 format: date
 *                 description: Date de fin d'occupation (défaut = maintenant)
 *     responses:
 *       200:
 *         description: Box libéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 liberation:
 *                   type: object
 *                   properties:
 *                     box:
 *                       type: object
 *                     boutique:
 *                       type: object
 *                     date_debut:
 *                       type: string
 *                       format: date
 *                     date_fin:
 *                       type: string
 *                       format: date
 *                     duree_occupation:
 *                       type: string
 *       400:
 *         description: Box déjà libre
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Box non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/:boxId/liberer', libererBox);

/**
 * @swagger
 * /box/{boxId}/transferer:
 *   post:
 *     summary: Transférer un box d'une boutique à une autre
 *     tags: [Boxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boxId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du box
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nouvelleBoutiqueId
 *             properties:
 *               nouvelleBoutiqueId:
 *                 type: string
 *                 description: ID de la nouvelle boutique
 *               date_transfert:
 *                 type: string
 *                 format: date
 *                 description: Date du transfert (défaut = maintenant)
 *     responses:
 *       200:
 *         description: Box transféré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 transfert:
 *                   type: object
 *       400:
 *         description: Box libre ou nouvelle boutique déjà équipée
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Box ou boutique non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/:boxId/transferer', transfererBox);

/**
 * @swagger
 * /box/{boxId}:
 *   put:
 *     summary: Mettre à jour un box
 *     tags: [Boxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boxId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du box
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numero:
 *                 type: string
 *                 description: Nouveau numéro
 *               surface:
 *                 type: number
 *                 description: Nouvelle surface
 *               prix_loyer:
 *                 type: number
 *                 description: Nouveau prix de loyer
 *     responses:
 *       200:
 *         description: Box mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 box:
 *                   $ref: '#/components/schemas/Box'
 *       400:
 *         description: Erreur de validation
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Box non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:boxId', updateBox);

/**
 * @swagger
 * /box/{boxId}:
 *   delete:
 *     summary: Supprimer un box (uniquement si libre et sans historique)
 *     tags: [Boxes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boxId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du box
 *     responses:
 *       200:
 *         description: Box supprimé avec succès
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
 *         description: Box occupé ou avec historique
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Box non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:boxId', deleteBox);

/**
 * @swagger
 * components:
 *   schemas:
 *     Box:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         numero:
 *           type: string
 *         surface:
 *           type: number
 *         prix_loyer:
 *           type: number
 *         libre:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date
 *         updatedAt:
 *           type: string
 *           format: date
 *     
 *     BoxDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/Box'
 *         - type: object
 *           properties:
 *             occupe_par:
 *               type: object
 *               nullable: true
 *             historique_actif:
 *               type: object
 *               nullable: true
 *     
 *     BoxHistorique:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         box:
 *           type: string
 *         boutique:
 *           $ref: '#/components/schemas/BoutiqueSimple'
 *         date_debut:
 *           type: string
 *           format: date
 *         date_fin:
 *           type: string
 *           format: date
 *           nullable: true
 *     
 *     BoutiqueSimple:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         nom:
 *           type: string
 *         description:
 *           type: string
 */

module.exports = router;