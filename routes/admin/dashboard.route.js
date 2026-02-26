/**
 * dashboard.routes.js
 * Monter dans app.js : app.use('/admin/dashboard', require('./routes/dashboard.routes'));
 * Ajouter un middleware d'authentification + vérification rôle admin avant ces routes.
 */

const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/admin/dashboard.controller');

// const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');
// router.use(verifyToken, isAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// SWAGGER COMPONENTS (schemas réutilisables)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     SuccessEnveloppe:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Erreur serveur
 *         error:
 *           type: string
 *
 *     BoxDetail:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         numero:
 *           type: string
 *           example: B-01
 *         surface:
 *           type: number
 *           example: 24
 *         prix_loyer:
 *           type: number
 *           example: 800
 *         libre:
 *           type: boolean
 *         boutique_actuelle:
 *           nullable: true
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             nom:
 *               type: string
 *
 *     StatutCount:
 *       type: object
 *       properties:
 *         statut:
 *           type: string
 *         total:
 *           type: integer
 *
 *     MoisEvolution:
 *       type: object
 *       properties:
 *         annee:
 *           type: integer
 *         mois:
 *           type: integer
 *         label:
 *           type: string
 *           example: fév. 26
 *         total:
 *           type: integer
 *
 *     MoisCommandesEvolution:
 *       allOf:
 *         - $ref: '#/components/schemas/MoisEvolution'
 *         - type: object
 *           properties:
 *             click_collect:
 *               type: integer
 *             livraison:
 *               type: integer
 *
 *     StatutPaiement:
 *       type: object
 *       properties:
 *         boutique_id:
 *           type: string
 *         nom:
 *           type: string
 *         statut:
 *           type: string
 *           enum: [A_JOUR, EN_RETARD, AUCUN_PAIEMENT]
 *         date_fin:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         periode:
 *           type: string
 *           enum: [mensuel, trimestriel, annuel]
 *
 *     TicketResume:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         boutique:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             nom:
 *               type: string
 *         sujet:
 *           type: string
 *         description:
 *           type: string
 *         statut:
 *           type: string
 *           enum: [OUVERT, EN_COURS, RESOLU]
 *         priorite:
 *           type: string
 *           enum: [BASSE, MOYENNE, HAUTE, URGENT]
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     AvisResume:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         boutique_nom:
 *           type: string
 *         note:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         commentaire:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

// ─────────────────────────────────────────────────────────────────────────────
// TAGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Dashboard Admin
 *   description: Statistiques et indicateurs pour l'administrateur du centre commercial
 */

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/dashboard/overview:
 *   get:
 *     summary: Snapshot global du dashboard
 *     description: >
 *       Retourne en un seul appel tous les KPIs critiques nécessaires à
 *       l'affichage initial du dashboard (boxes, boutiques, loyers, commandes,
 *       tickets, satisfaction). Toutes les requêtes sont exécutées en parallèle.
 *     tags: [Dashboard Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Snapshot global retourné avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnveloppe'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         boxes:
 *                           type: object
 *                           properties:
 *                             total:            { type: integer, example: 24 }
 *                             occupees:         { type: integer, example: 19 }
 *                             libres:           { type: integer, example: 5  }
 *                             taux_occupation:  { type: integer, example: 79 }
 *                         boutiques:
 *                           type: object
 *                           properties:
 *                             total:     { type: integer, example: 19 }
 *                             actives:   { type: integer, example: 17 }
 *                             inactives: { type: integer, example: 2  }
 *                         loyers:
 *                           type: object
 *                           properties:
 *                             mois_en_cours: { type: number,  example: 15200 }
 *                             nb_en_retard:  { type: integer, example: 2     }
 *                         commandes:
 *                           type: object
 *                           properties:
 *                             total_30j:
 *                               type: integer
 *                               example: 310
 *                             repartition_statuts:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/StatutCount'
 *                         tickets:
 *                           type: object
 *                           properties:
 *                             ouverts:             { type: integer, example: 4 }
 *                             urgents_non_resolus: { type: integer, example: 1 }
 *                         satisfaction:
 *                           type: object
 *                           properties:
 *                             note_moyenne_centre: { type: number,  example: 4.4 }
 *                             total_avis:          { type: integer, example: 380 }
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/overview', ctrl.getOverview);

/**
 * @swagger
 * /admin/dashboard/boxes:
 *   get:
 *     summary: Statistiques des boxes et taux d'occupation
 *     description: >
 *       Retourne le nombre total de boxes, le nombre d'occupées et de libres,
 *       le taux d'occupation en pourcentage, ainsi que le détail de chaque box
 *       avec la boutique actuellement locataire si elle existe.
 *     tags: [Dashboard Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques des boxes retournées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnveloppe'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 24
 *                         occupees:
 *                           type: integer
 *                           example: 19
 *                         libres:
 *                           type: integer
 *                           example: 5
 *                         taux_occupation:
 *                           type: integer
 *                           example: 79
 *                           description: Pourcentage arrondi
 *                         detail:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/BoxDetail'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/boxes', ctrl.getBoxesStats);

/**
 * @swagger
 * /admin/dashboard/boutiques:
 *   get:
 *     summary: Liste et statistiques des boutiques
 *     description: >
 *       Retourne la liste des boutiques enrichie avec le nombre de commandes,
 *       triable par note moyenne ou par volume de commandes.
 *       Le chiffre d'affaires des boutiques n'est pas exposé.
 *     tags: [Dashboard Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tri
 *         schema:
 *           type: string
 *           enum: [note, commandes]
 *           default: note
 *         description: Critère de tri de la liste
 *       - in: query
 *         name: actif
 *         schema:
 *           type: string
 *           enum: [true, false, all]
 *           default: all
 *         description: Filtrer par statut actif/inactif
 *     responses:
 *       200:
 *         description: Statistiques boutiques retournées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnveloppe'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 19
 *                         actives:
 *                           type: integer
 *                           example: 17
 *                         inactives:
 *                           type: integer
 *                           example: 2
 *                         liste:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:          { type: string }
 *                               nom:          { type: string }
 *                               active:       { type: boolean }
 *                               note_moyenne: { type: number,  example: 4.5 }
 *                               nb_commandes: { type: integer, example: 128 }
 *                               box:
 *                                 type: object
 *                                 properties:
 *                                   numero:     { type: string }
 *                                   surface:    { type: number }
 *                                   prix_loyer: { type: number }
 *                               categories:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     _id: { type: string }
 *                                     nom: { type: string }
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/boutiques', ctrl.getBoutiquesStats);

/**
 * @swagger
 * /admin/dashboard/finances:
 *   get:
 *     summary: Statistiques financières — loyers uniquement
 *     description: >
 *       Retourne l'évolution mensuelle des loyers encaissés sur une période
 *       glissante, le total de la période, le montant du mois en cours,
 *       et le statut de paiement (à jour / en retard) de chaque boutique active.
 *       Les données financières propres aux boutiques (CA, marges) ne sont pas exposées.
 *     tags: [Dashboard Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mois
 *         schema:
 *           type: integer
 *           default: 6
 *           minimum: 1
 *           maximum: 24
 *         description: Nombre de mois de l'historique à retourner
 *     responses:
 *       200:
 *         description: Statistiques financières retournées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnveloppe'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         total_periode:
 *                           type: number
 *                           example: 92400
 *                           description: Somme des loyers encaissés sur toute la période
 *                         mois_en_cours:
 *                           type: number
 *                           example: 15200
 *                         evolution_mensuelle:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/MoisEvolution'
 *                         statut_paiements:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/StatutPaiement'
 *                         nb_en_retard:
 *                           type: integer
 *                           example: 2
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/finances', ctrl.getFinancesStats);

/**
 * @swagger
 * /admin/dashboard/commandes:
 *   get:
 *     summary: Statistiques des commandes
 *     description: >
 *       Retourne le volume de commandes sur une période glissante, décomposé
 *       par mode de livraison (CLICK_COLLECT / LIVRAISON) et par statut
 *       (PAYEE, EN_PREPARATION, PRETE, LIVREE).
 *       Les montants ne sont pas exposés.
 *       Inclut également le top 5 des boutiques par volume de commandes.
 *     tags: [Dashboard Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mois
 *         schema:
 *           type: integer
 *           default: 6
 *           minimum: 1
 *           maximum: 24
 *         description: Nombre de mois de l'historique à retourner
 *     responses:
 *       200:
 *         description: Statistiques commandes retournées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnveloppe'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         total_periode:
 *                           type: integer
 *                           example: 1510
 *                         repartition_statuts:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/StatutCount'
 *                         evolution_mensuelle:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/MoisCommandesEvolution'
 *                         top_boutiques:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               boutique_id:  { type: string }
 *                               nom:          { type: string }
 *                               nb_commandes: { type: integer, example: 204 }
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/commandes', ctrl.getCommandesStats);

/**
 * @swagger
 * /admin/dashboard/tickets:
 *   get:
 *     summary: Statistiques et liste des tickets de support
 *     description: >
 *       Retourne les compteurs de tickets par statut et par priorité,
 *       isole les tickets URGENT non résolus pour alerte immédiate,
 *       et fournit une liste filtrée des tickets (commentaires exclus).
 *     tags: [Dashboard Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [OUVERT, EN_COURS, RESOLU, TOUS]
 *           default: TOUS
 *         description: Filtrer la liste par statut
 *       - in: query
 *         name: priorite
 *         schema:
 *           type: string
 *           enum: [BASSE, MOYENNE, HAUTE, URGENT, TOUS]
 *           default: TOUS
 *         description: Filtrer la liste par priorité
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Nombre maximum de tickets à retourner
 *     responses:
 *       200:
 *         description: Statistiques tickets retournées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnveloppe'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         compteurs:
 *                           type: object
 *                           properties:
 *                             par_statut:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/StatutCount'
 *                             par_priorite:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   priorite: { type: string }
 *                                   total:    { type: integer }
 *                         tickets_urgents:
 *                           type: array
 *                           description: Tickets URGENT non résolus — à traiter en priorité
 *                           items:
 *                             $ref: '#/components/schemas/TicketResume'
 *                         liste:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/TicketResume'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/tickets', ctrl.getTicketsStats);

/**
 * @swagger
 * /admin/dashboard/avis:
 *   get:
 *     summary: Statistiques de satisfaction et derniers avis
 *     description: >
 *       Retourne la note moyenne globale du centre commercial calculée sur
 *       tous les avis de type BOUTIQUE, la distribution des notes de 1 à 5,
 *       le top 5 des boutiques les mieux notées, et les derniers avis reçus.
 *     tags: [Dashboard Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Nombre de derniers avis à retourner
 *     responses:
 *       200:
 *         description: Statistiques avis retournées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnveloppe'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         note_moyenne_centre:
 *                           type: number
 *                           example: 4.4
 *                           description: Moyenne arrondie à 1 décimale
 *                         total_avis:
 *                           type: integer
 *                           example: 380
 *                         distribution_notes:
 *                           type: array
 *                           description: Répartition de 5 étoiles à 1 étoile
 *                           items:
 *                             type: object
 *                             properties:
 *                               note:  { type: integer, example: 5    }
 *                               label: { type: string,  example: "5 ★" }
 *                               total: { type: integer, example: 134  }
 *                         top_boutiques:
 *                           type: array
 *                           description: Top 5 boutiques actives par note moyenne
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:          { type: string }
 *                               nom:          { type: string }
 *                               note_moyenne: { type: number }
 *                               box:
 *                                 type: object
 *                                 properties:
 *                                   numero: { type: string }
 *                         derniers_avis:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AvisResume'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/avis', ctrl.getAvisStats);

module.exports = router;