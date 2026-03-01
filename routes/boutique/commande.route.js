const express = require('express');
const router  = express.Router({ mergeParams: true }); // mergeParams pour accéder à :boutiqueId du parent
const {
  getCommandesByBoutique,
  getDashboardBoutique,
  marquerCommandeLivree,
  marquerCommandeRecuperee,
  getDashboardResponsable
} = require('../../controllers/boutique/commande.controller');

const  authMiddleware  = require('../../middlewares/auth.middleware');
router.use(authMiddleware(['boutique'])); // Protéger toutes les routes de ce router pour les administrateurs et vendeurs
/**
 * @swagger
 * tags:
 *   name: Boutique - Commandes
 *   description: Gestion des commandes et dashboard d'une boutique
 */

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD  —  ⚠️ doit être AVANT /:commandeId pour éviter les conflits Express
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /boutique/commande/{boutiqueId}/dashboard:
 *   get:
 *     summary: Dashboard complet de la boutique
 *     description: |
 *       Retourne toutes les métriques nécessaires au dashboard d'une boutique.
 *
 *       ### Données retournées
 *
 *       | Clé | Description | Graphique suggéré |
 *       |-----|-------------|-------------------|
 *       | `resume` | CA total, moyenne panier, répartition statuts, livraison vs récupération | Camembert statuts + Camembert types |
 *       | `periodes` | CA aujourd'hui / semaine / mois en cours / mois précédent + évolution % | KPI cards |
 *       | `evolution_journaliere` | CA jour par jour sur 30 jours | Courbe |
 *       | `top_produits` | Top 5 produits (quantité vendue + CA) | Barres horizontales |
 *       | `top_clients` | Top 5 clients (nb commandes + dépense totale) | Tableau |
 *       | `heures_de_pointe` | Distribution des commandes par heure (0–23h) | Barres |
 *       | `classement_boutiques` | Top 10 boutiques par nb commandes + rang de la boutique courante | Tableau classement |
 *
 *       > Les commandes annulées sont exclues des métriques CA et produits.
 *     tags: [Boutique - Commandes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boutiqueId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *     responses:
 *       200:
 *         description: Dashboard généré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 boutique_id:
 *                   type: string
 *                   example: "699753415bf4be700e989b1e"
 *                 genere_le:
 *                   type: string
 *                   format: date-time
 *                 resume:
 *                   type: object
 *                   properties:
 *                     total_commandes:
 *                       type: integer
 *                       example: 42
 *                     ca_total:
 *                       type: number
 *                       example: 12500000
 *                     moyenne_panier:
 *                       type: number
 *                       example: 297619
 *                     repartition_statuts:
 *                       type: object
 *                       description: Données pour graphique camembert statuts
 *                       properties:
 *                         EN_ATTENTE: { type: integer, example: 5 }
 *                         LIVREE:     { type: integer, example: 20 }
 *                         RECUPEREE:  { type: integer, example: 15 }
 *                         ANNULEE:    { type: integer, example: 2 }
 *                     repartition_types:
 *                       type: object
 *                       description: Données pour graphique camembert livraison vs récupération
 *                       properties:
 *                         livraison:    { type: integer, example: 18 }
 *                         recuperation: { type: integer, example: 24 }
 *                 periodes:
 *                   type: object
 *                   description: CA et nb commandes par période — pour les KPI cards
 *                   properties:
 *                     aujourd_hui:
 *                       $ref: '#/components/schemas/PeriodeStat'
 *                     semaine:
 *                       $ref: '#/components/schemas/PeriodeStat'
 *                     mois_en_cours:
 *                       $ref: '#/components/schemas/PeriodeStat'
 *                     mois_precedent:
 *                       $ref: '#/components/schemas/PeriodeStat'
 *                     evolution_ca_vs_mois_precedent:
 *                       type: string
 *                       description: Évolution du CA mois en cours vs mois précédent
 *                       example: "+14.3%"
 *                 evolution_journaliere:
 *                   type: array
 *                   description: CA jour par jour sur les 30 derniers jours — pour graphique courbe
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:         { type: string, example: "2026-02-20" }
 *                       ca:           { type: number, example: 540000 }
 *                       nb_commandes: { type: integer, example: 2 }
 *                 top_produits:
 *                   type: array
 *                   description: Top 5 produits les plus vendus — pour graphique barres
 *                   items:
 *                     type: object
 *                     properties:
 *                       nom:         { type: string }
 *                       image:       { type: string, nullable: true }
 *                       total_vendu: { type: integer, example: 12 }
 *                       ca_genere:   { type: number, example: 3240000 }
 *                 top_clients:
 *                   type: array
 *                   description: Top 5 clients les plus fréquents
 *                   items:
 *                     type: object
 *                     properties:
 *                       nom:           { type: string }
 *                       prenom:        { type: string }
 *                       email:         { type: string }
 *                       nb_commandes:  { type: integer, example: 5 }
 *                       total_depense: { type: number, example: 1500000 }
 *                 heures_de_pointe:
 *                   type: array
 *                   description: Distribution des commandes par heure — pour graphique barres
 *                   items:
 *                     type: object
 *                     properties:
 *                       heure:        { type: integer, example: 14 }
 *                       nb_commandes: { type: integer, example: 12 }
 *                 classement_boutiques:
 *                   type: object
 *                   description: Top 10 boutiques par nb commandes toutes boutiques confondues
 *                   properties:
 *                     rang_boutique_courante:
 *                       type: integer
 *                       nullable: true
 *                       description: Rang de cette boutique dans le top 10 (null si hors top 10)
 *                       example: 2
 *                     top_10:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           boutique_id:          { type: string }
 *                           nom:                  { type: string }
 *                           photo:                { type: string, nullable: true }
 *                           nb_commandes:         { type: integer }
 *                           ca_total:             { type: number }
 *                           est_boutique_courante: { type: boolean }
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/dashboard',  getDashboardBoutique);
router.get('/responsable/:responsableId/dashboard', getDashboardResponsable);
// ─────────────────────────────────────────────────────────────────────────────
// LISTER LES COMMANDES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /boutique/commande/{boutiqueId}:
 *   get:
 *     summary: Lister les commandes d'une boutique
 *     description: |
 *       Retourne les commandes d'une boutique avec pagination, filtres et statistiques globales.
 *
 *       Toutes les commandes reçues sont déjà **payées**.
 *       - `livraison != null` → commande à livrer → `peut_livrer: true`
 *       - `livraison == null` → commande à récupérer en boutique → `peut_recuperer: true`
 *
 *       ### Exemples d'utilisation
 *       - Commandes en attente : `?statut=EN_ATTENTE`
 *       - Commandes à livrer : `?statut=EN_ATTENTE` (filtrer côté front sur `peut_livrer`)
 *       - Historique d'un client : `?utilisateur=<id>&statut=LIVREE,RECUPEREE`
 *       - Commandes du mois : `?date_debut=2026-02-01&date_fin=2026-02-28`
 *     tags: [Boutique - Commandes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boutiqueId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique (obligatoire)
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *         description: |
 *           Statut(s) séparés par virgule. Défaut : .
 *           Valeurs possibles : `EN_ATTENTE`, `LIVREE`, `RECUPEREE`, `ANNULEE`, `PAYEE`
 *         example: "EN_ATTENTE,LIVREE"
 *       - in: query
 *         name: utilisateur
 *         schema:
 *           type: string
 *         description: ID du client — filtre optionnel pour voir les commandes d'un client spécifique
 *       - in: query
 *         name: date_debut
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (incluse)
 *         example: "2026-02-01"
 *       - in: query
 *         name: date_fin
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (incluse, heure 23:59:59)
 *         example: "2026-02-28"
 *       - in: query
 *         name: prix_min
 *         schema:
 *           type: number
 *         description: Montant total minimum
 *       - in: query
 *         name: prix_max
 *         schema:
 *           type: number
 *         description: Montant total maximum
 *       - in: query
 *         name: tri
 *         schema:
 *           type: string
 *           enum: [date_asc, date_desc, montant_asc, montant_desc, statut]
 *           default: date_desc
 *         description: Ordre de tri des résultats
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Liste des commandes avec pagination et statistiques
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "5 commande(s) trouvée(s)"
 *                 commandes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CommandeEnrichie'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:  { type: integer, example: 1 }
 *                     limit: { type: integer, example: 10 }
 *                     total: { type: integer, example: 42 }
 *                     pages: { type: integer, example: 5 }
 *                 statistiques:
 *                   type: object
 *                   description: Statistiques globales de la boutique (indépendantes du filtre)
 *                   properties:
 *                     total_commandes: { type: integer }
 *                     total_depense:   { type: number }
 *                     moyenne_panier:  { type: number }
 *                     repartition_statuts:
 *                       type: object
 *                       properties:
 *                         EN_ATTENTE: { type: integer }
 *                         PAYEE:      { type: integer }
 *                         LIVREE:     { type: integer }
 *                         RECUPEREE:  { type: integer }
 *                         ANNULEE:    { type: integer }
 *                 filtres_appliques:
 *                   type: object
 *                   properties:
 *                     boutique:    { type: string }
 *                     utilisateur: { type: string, nullable: true }
 *                     statut:      { type: string }
 *                     date_debut:  { type: string, nullable: true }
 *                     date_fin:    { type: string, nullable: true }
 *                     tri:         { type: string }
 *                 total_en_attente:
 *                   type: integer
 *                   description: Nombre total de commandes EN_ATTENTE pour cette boutique
 *                   example: 5
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:boutiqueId',  getCommandesByBoutique);

// ─────────────────────────────────────────────────────────────────────────────
// MARQUER COMME LIVRÉE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /boutique/commande/{boutiqueId}/{commandeId}/livrer:
 *   patch:
 *     summary: Marquer une commande comme livrée
 *     description: |
 *       Change le statut d'une commande à `LIVREE`.
 *
 *       **Conditions requises :**
 *       - `livraison` doit être renseigné (commande avec adresse de livraison)
 *       - Le statut doit être `EN_ATTENTE`
 *
 *       > Pour les commandes sans livraison (retrait boutique), utiliser `/recuperer`.
 *     tags: [Boutique - Commandes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boutiqueId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *       - in: path
 *         name: commandeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la commande à marquer comme livrée
 *     responses:
 *       200:
 *         description: Commande marquée comme livrée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Commande marquée comme livrée avec succès." }
 *                 data:
 *                   $ref: '#/components/schemas/Commande'
 *       400:
 *         description: |
 *           Erreur métier :
 *           - La commande est prévue pour une récupération (pas de livraison)
 *           - Le statut n'est pas EN_ATTENTE
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Commande introuvable pour cette boutique
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:boutiqueId/:commandeId/livrer',  marquerCommandeLivree);

// ─────────────────────────────────────────────────────────────────────────────
// MARQUER COMME RÉCUPÉRÉE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /boutique/commande/{boutiqueId}/{commandeId}/recuperer:
 *   patch:
 *     summary: Marquer une commande comme récupérée en boutique
 *     description: |
 *       Change le statut d'une commande à `RECUPEREE`.
 *
 *       **Conditions requises :**
 *       - `livraison` doit être `null` ou absent (retrait en boutique)
 *       - Le statut doit être `EN_ATTENTE`
 *
 *       > Pour les commandes avec livraison à domicile, utiliser `/livrer`.
 *     tags: [Boutique - Commandes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boutiqueId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *       - in: path
 *         name: commandeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la commande à marquer comme récupérée
 *     responses:
 *       200:
 *         description: Commande marquée comme récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Commande marquée comme récupérée avec succès." }
 *                 data:
 *                   $ref: '#/components/schemas/Commande'
 *       400:
 *         description: |
 *           Erreur métier :
 *           - La commande est prévue pour une livraison (pas un retrait)
 *           - Le statut n'est pas EN_ATTENTE
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Commande introuvable pour cette boutique
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:boutiqueId/:commandeId/recuperer', marquerCommandeRecuperee);

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS PARTAGÉS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     PeriodeStat:
 *       type: object
 *       properties:
 *         ca:           { type: number,  example: 540000 }
 *         nb_commandes: { type: integer, example: 3 }
 *
 *     Livraison:
 *       type: object
 *       properties:
 *         adresse:  { type: string,  example: "12 rue des Fleurs, Antananarivo" }
 *         distance: { type: number,  example: 3.5 }
 *         frais:    { type: number,  example: 2000 }
 *
 *     Commande:
 *       type: object
 *       properties:
 *         _id:           { type: string }
 *         utilisateur:   { type: string, description: "ID de l'utilisateur" }
 *         boutique:      { type: string, description: "ID de la boutique" }
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               produit:       { type: string }
 *               prix_unitaire: { type: number }
 *               quantite:      { type: integer }
 *         livraison:
 *           nullable: true
 *           allOf:
 *             - $ref: '#/components/schemas/Livraison'
 *         montant_total: { type: number,  example: 540000 }
 *         statut:
 *           type: string
 *           enum: [EN_ATTENTE, PAYEE, LIVREE, RECUPEREE, ANNULEE]
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     CommandeEnrichie:
 *       type: object
 *       description: Commande avec champs calculés pour l'affichage
 *       properties:
 *         _id:           { type: string }
 *         boutique:      { type: string }
 *         utilisateur:
 *           type: object
 *           properties:
 *             _id:    { type: string }
 *             nom:    { type: string }
 *             prenom: { type: string }
 *             email:  { type: string }
 *         date:          { type: string, format: date-time }
 *         montant_total: { type: number }
 *         statut:        { type: string, enum: [EN_ATTENTE, PAYEE, LIVREE, RECUPEREE, ANNULEE] }
 *         statut_info:
 *           type: object
 *           properties:
 *             label:   { type: string, example: "En attente" }
 *             couleur: { type: string, example: "orange" }
 *         nombre_articles: { type: integer, example: 3 }
 *         apercu_produits:
 *           type: array
 *           description: Aperçu des 3 premiers articles
 *           items:
 *             type: object
 *             properties:
 *               nom:           { type: string }
 *               image:         { type: string, nullable: true }
 *               quantite:      { type: integer }
 *               prix_unitaire: { type: number }
 *         livraison:
 *           nullable: true
 *           allOf:
 *             - $ref: '#/components/schemas/Livraison'
 *         peut_annuler:   { type: boolean, description: "true si statut EN_ATTENTE" }
 *         peut_livrer:    { type: boolean, description: "true si EN_ATTENTE et livraison != null" }
 *         peut_recuperer: { type: boolean, description: "true si EN_ATTENTE et livraison == null" }
 *
 *     Error:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         message: { type: string,  example: "Message d'erreur descriptif" }
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

module.exports = router;