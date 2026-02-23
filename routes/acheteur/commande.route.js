const express = require('express');
const router = express.Router();
const {
  payerCommande,
  listerCommandes,
  getCommandeDetails,
  annulerCommande
} = require('../../controllers/acheteur/commande.controller');

const authMiddleware = require('../../middlewares/auth.middleware');
// Toutes les routes des commandes nécessitent une authentification
router.use(authMiddleware(['acheteur']));

/**
 * @swagger
 * tags:
 *   name: Commandes Acheteur
 *   description: Gestion des commandes pour les acheteurs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserInfo:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d5"
 *         username:
 *           type: string
 *           example: "jean_dupont"
 *         email:
 *           type: string
 *           example: "jean.dupont@email.com"
 *     
 *     BoutiqueInfo:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d2"
 *         nom:
 *           type: string
 *           example: "Ferme du Soleil"
 *         email:
 *           type: string
 *           example: "contact@fermedusoleil.com"
 *         telephone:
 *           type: string
 *           example: "+221 77 123 45 67"
 *         adresse:
 *           type: string
 *           example: "Dakar, Senegal"
 *     
 *     ProduitCommande:
 *       type: object
 *       properties:
 *         produit:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: "65f1a2b3c4d5e6f7a8b9c0d1"
 *             nom:
 *               type: string
 *               example: "Tomates bio"
 *             prix:
 *               type: number
 *               example: 2.99
 *             images:
 *               type: array
 *               items:
 *                 type: string
 *                 example: "https://example.com/images/tomates.jpg"
 *             description:
 *               type: string
 *               example: "Tomates fraîches du jardin"
 *         prix_unitaire:
 *           type: number
 *           example: 2.99
 *         quantite:
 *           type: integer
 *           example: 3
 *         total:
 *           type: number
 *           example: 8.97
 *         prix_original:
 *           type: number
 *           example: 3.50
 *         economies:
 *           type: number
 *           example: 1.53
 *     
 *     StatutInfo:
 *       type: object
 *       properties:
 *         libelle:
 *           type: string
 *           example: "En attente de paiement"
 *         couleur:
 *           type: string
 *           enum: [orange, blue, green, red, gray]
 *           example: "orange"
 *         icon:
 *           type: string
 *           example: "⏳"
 *         description:
 *           type: string
 *           example: "Commande enregistrée en attente de confirmation de paiement"
 *     
 *     PaiementInfo:
 *       type: object
 *       properties:
 *         mode:
 *           type: string
 *           enum: [CARTE, ORANGE_MONEY, WAVE, FREE_MONEY, ESPECES]
 *           example: "CARTE"
 *         date:
 *           type: string
 *           format: date-time
 *           example: "2024-02-23T10:35:00Z"
 *         montant:
 *           type: number
 *           example: 29.99
 *         statut:
 *           type: string
 *           example: "Effectué"
 *     
 *     Commande:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d4"
 *         utilisateur:
 *           $ref: '#/components/schemas/UserInfo'
 *         boutique:
 *           $ref: '#/components/schemas/BoutiqueInfo'
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProduitCommande'
 *         montant_total:
 *           type: number
 *           example: 29.99
 *         statut:
 *           type: string
 *           enum: [EN_ATTENTE, PAYEE, LIVREE, ANNULEE]
 *           example: "EN_ATTENTE"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-02-23T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-02-23T10:30:00Z"
 *     
 *     CommandeListe:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "65f1a2b3c4d5e6f7a8b9c0d4"
 *         boutique:
 *           type: string
 *           example: "Ferme du Soleil"
 *         date:
 *           type: string
 *           format: date-time
 *           example: "2024-02-23T10:30:00Z"
 *         montant_total:
 *           type: number
 *           example: 29.99
 *         statut:
 *           type: string
 *           enum: [EN_ATTENTE, PAYEE, LIVREE, ANNULEE]
 *           example: "EN_ATTENTE"
 *         statut_info:
 *           $ref: '#/components/schemas/StatutInfo'
 *         nombre_articles:
 *           type: integer
 *           example: 5
 *         apercu_produits:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *                 example: "Tomates bio"
 *               image:
 *                 type: string
 *                 nullable: true
 *                 example: "https://example.com/images/tomates.jpg"
 *               quantite:
 *                 type: integer
 *                 example: 2
 *         peut_annuler:
 *           type: boolean
 *           example: true
 *         peut_payer:
 *           type: boolean
 *           example: true
 *     
 *     CommandeDetails:
 *       type: object
 *       properties:
 *         commande:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               example: "65f1a2b3c4d5e6f7a8b9c0d4"
 *             reference:
 *               type: string
 *               example: "CMD-A8B9C0D4"
 *             date:
 *               type: string
 *               format: date-time
 *               example: "2024-02-23T10:30:00Z"
 *             statut:
 *               type: string
 *               enum: [EN_ATTENTE, PAYEE, LIVREE, ANNULEE]
 *               example: "EN_ATTENTE"
 *             statut_info:
 *               $ref: '#/components/schemas/StatutInfo'
 *             montant_total:
 *               type: number
 *               example: 29.99
 *             total_original:
 *               type: number
 *               example: 34.99
 *             economies:
 *               type: number
 *               example: 5.00
 *             boutique:
 *               $ref: '#/components/schemas/BoutiqueInfo'
 *             utilisateur:
 *               $ref: '#/components/schemas/UserInfo'
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProduitCommande'
 *         paiement:
 *           $ref: '#/components/schemas/PaiementInfo'
 *         chronologie:
 *           type: object
 *           properties:
 *             creation:
 *               type: string
 *               format: date-time
 *               example: "2024-02-23T10:30:00Z"
 *             paiement:
 *               type: string
 *               format: date-time
 *               nullable: true
 *               example: null
 *             livraison:
 *               type: string
 *               format: date-time
 *               nullable: true
 *               example: null
 *             annulation:
 *               type: string
 *               format: date-time
 *               nullable: true
 *               example: null
 *         actions_disponibles:
 *           type: object
 *           properties:
 *             peut_payer:
 *               type: boolean
 *               example: true
 *             peut_annuler:
 *               type: boolean
 *               example: true
 *             peut_contacter:
 *               type: boolean
 *               example: true
 *     
 *     StatistiquesCommandes:
 *       type: object
 *       properties:
 *         total_commandes:
 *           type: integer
 *           example: 25
 *         total_depense:
 *           type: number
 *           example: 1250.50
 *         moyenne_panier:
 *           type: number
 *           example: 50.02
 *         repartition_statuts:
 *           type: object
 *           properties:
 *             EN_ATTENTE:
 *               type: integer
 *               example: 5
 *             PAYEE:
 *               type: integer
 *               example: 10
 *             LIVREE:
 *               type: integer
 *               example: 8
 *             ANNULEE:
 *               type: integer
 *               example: 2
 *     
 *     RecuPaiement:
 *       type: object
 *       properties:
 *         numéro:
 *           type: string
 *           example: "CMD-A8B9C0D4"
 *         date:
 *           type: string
 *           example: "23/02/2024"
 *         montant:
 *           type: string
 *           example: "29.99 €"
 */


/**
 * @swagger
 * /commandes:
 *   get:
 *     summary: Lister les commandes de l'utilisateur avec filtres
 *     tags: [Commandes Acheteur]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *         description: "Filtrer par statut (séparer plusieurs statuts par des virgules: EN_ATTENTE,PAYEE)"
 *         example: "EN_ATTENTE,PAYEE"
 *       - in: query
 *         name: boutique
 *         schema:
 *           type: string
 *         description: Filtrer par ID de boutique
 *         example: "65f1a2b3c4d5e6f7a8b9c0d2"
 *       - in: query
 *         name: date_debut
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: date_fin
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD)
 *         example: "2024-12-31"
 *       - in: query
 *         name: prix_min
 *         schema:
 *           type: number
 *         description: Prix minimum
 *         example: 10
 *       - in: query
 *         name: prix_max
 *         schema:
 *           type: number
 *         description: Prix maximum
 *         example: 100
 *       - in: query
 *         name: tri
 *         schema:
 *           type: string
 *           enum: [date_desc, date_asc, montant_desc, montant_asc, statut]
 *           default: date_desc
 *         description: "Tri des résultats: date_desc (plus récent), date_asc (plus ancien), montant_desc (montant décroissant), montant_asc (montant croissant), statut (par statut)"
 *         example: "date_desc"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numéro de page
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Nombre d'éléments par page
 *         example: 10
 *     responses:
 *       200:
 *         description: Liste des commandes récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 commandes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CommandeListe'
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
 *                       example: 25
 *                     pages:
 *                       type: integer
 *                       example: 3
 *                 statistiques:
 *                   $ref: '#/components/schemas/StatistiquesCommandes'
 *                 filtres_appliques:
 *                   type: object
 *                   properties:
 *                     statut:
 *                       type: string
 *                       example: "EN_ATTENTE,PAYEE"
 *                     date_debut:
 *                       type: string
 *                       nullable: true
 *                       example: "2024-01-01"
 *                     date_fin:
 *                       type: string
 *                       nullable: true
 *                       example: "2024-12-31"
 *                     tri:
 *                       type: string
 *                       example: "date_desc"
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Authentification requise"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur lors de la récupération des commandes"
 */
router.get('/', listerCommandes);

/**
 * @swagger
 * /commandes/{commandeId}:
 *   get:
 *     summary: Obtenir les détails d'une commande spécifique
 *     tags: [Commandes Acheteur]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commandeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la commande à récupérer
 *         example: "65f1a2b3c4d5e6f7a8b9c0d4"
 *     responses:
 *       200:
 *         description: Détails de la commande récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommandeDetails'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Authentification requise"
 *       403:
 *         description: Non autorisé - La commande n'appartient pas à l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vous n'êtes pas autorisé à voir cette commande"
 *       404:
 *         description: Commande non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Commande non trouvée"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur lors de la récupération de la commande"
 */
router.get('/:commandeId', getCommandeDetails);

/**
 * @swagger
 * /commandes/{commandeId}/payer:
 *   put:
 *     summary: Payer une commande (mettre à jour le statut et décrémenter le stock)
 *     tags: [Commandes Acheteur]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commandeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la commande à payer
 *         example: "65f1a2b3c4d5e6f7a8b9c0d4"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mode_paiement:
 *                 type: string
 *                 enum: [CARTE, ORANGE_MONEY, WAVE, FREE_MONEY, ESPECES]
 *                 description: Mode de paiement utilisé
 *                 default: "CARTE"
 *                 example: "ORANGE_MONEY"
 *     responses:
 *       200:
 *         description: Paiement effectué avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Paiement effectué avec succès"
 *                 commande:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "65f1a2b3c4d5e6f7a8b9c0d4"
 *                     boutique:
 *                       type: string
 *                       example: "Ferme du Soleil"
 *                     montant_total:
 *                       type: number
 *                       example: 29.99
 *                     statut:
 *                       type: string
 *                       example: "PAYEE"
 *                     date_paiement:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-02-23T10:35:00Z"
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           produit:
 *                             type: string
 *                             example: "Tomates bio"
 *                           quantite:
 *                             type: integer
 *                             example: 2
 *                           prix_unitaire:
 *                             type: number
 *                             example: 2.99
 *                           total:
 *                             type: number
 *                             example: 5.98
 *                 reçu:
 *                   $ref: '#/components/schemas/RecuPaiement'
 *       400:
 *         description: Erreur de paiement (stock insuffisant, produit indisponible)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stock insuffisant pour Tomates bio. Disponible: 5"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé - La commande n'appartient pas à l'utilisateur
 *       404:
 *         description: Commande non trouvée ou déjà traitée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Commande non trouvée ou déjà traitée"
 *       409:
 *         description: Conflit - La commande n'est pas en attente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Seules les commandes en attente peuvent être payées"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur lors du paiement de la commande"
 */
router.put('/:commandeId/payer', payerCommande);

/**
 * @swagger
 * /commandes/{commandeId}/annuler:
 *   put:
 *     summary: Annuler une commande
 *     tags: [Commandes Acheteur]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commandeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la commande à annuler
 *         example: "65f1a2b3c4d5e6f7a8b9c0d4"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               raison:
 *                 type: string
 *                 description: Motif de l'annulation
 *                 example: "Changement d'avis"
 *     responses:
 *       200:
 *         description: Commande annulée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Commande annulée avec succès"
 *                 commande:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "65f1a2b3c4d5e6f7a8b9c0d4"
 *                     statut:
 *                       type: string
 *                       example: "ANNULEE"
 *                     date_annulation:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-02-23T11:00:00Z"
 *       400:
 *         description: La commande ne peut pas être annulée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cette commande ne peut plus être annulée"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé - La commande n'appartient pas à l'utilisateur
 *       404:
 *         description: Commande non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Commande non trouvée ou ne peut pas être annulée"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur lors de l'annulation de la commande"
 */
router.put('/:commandeId/annuler', annulerCommande);

module.exports = router;