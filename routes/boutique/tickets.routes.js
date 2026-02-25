const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicket,
  addMessage,
  getTicketStats,
  searchTickets,
  getTicketsByStatus,
  getTicketsByPriority,
  updateTicketStatus,
  updateTicketPriority,
  resolveTicket,
  reopenTicket,
  deleteTicket
} = require('../../controllers/boutique/tickets.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { estBoutique } = require('../../middlewares/boutique.middleware');

router.use(authMiddleware(['boutique']));

/**
 * @swagger
 * tags:
 *   name: Boutique - Tickets
 *   description: Gestion des tickets de support pour les boutiques
 */
router.get('/stats', getTicketStats);              // GET /tickets/stats
router.get('/search', searchTickets);              // GET /tickets/search?q=mot
router.get('/statut/:statut', getTicketsByStatus); // GET /tickets/statut/OUVERT
router.get('/priorite/:priorite', getTicketsByPriority); 
/**
 * @swagger
 * components:
 *   schemas:
 *     Ticket:
 *       type: object
 *       required:
 *         - sujet
 *         - description
 *       properties:
 *         _id:
 *           type: string
 *           description: ID auto-généré du ticket
 *         boutique:
 *           type: string
 *           description: ID de la boutique
 *         sujet:
 *           type: string
 *           description: Sujet du ticket
 *         description:
 *           type: string
 *           description: Description détaillée du problème
 *         statut:
 *           type: string
 *           enum: [OUVERT, EN_COURS, RESOLU]
 *           default: OUVERT
 *           description: Statut actuel du ticket
 *         priorite:
 *           type: string
 *           enum: [BASSE, MOYENNE, HAUTE, URGENT]
 *           default: MOYENNE
 *           description: Niveau de priorité
 *         resolvedAt:
 *           type: string
 *           format: date-time
 *           description: Date de résolution (si résolu)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date de création
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date de dernière mise à jour
 *       example:
 *         _id: 60d21b4667d0d8992e610c85
 *         boutique: 60d21b4667d0d8992e610c86
 *         sujet: "Problème de connexion"
 *         description: "Impossible de se connecter à mon espace boutique"
 *         statut: OUVERT
 *         priorite: HAUTE
 *         createdAt: 2023-01-01T00:00:00.000Z
 *     
 *     TicketMessage:
 *       type: object
 *       properties:
 *         texte:
 *           type: string
 *           description: Contenu du message
 *         auteur:
 *           type: string
 *           description: ID de l'auteur du message
 *         date:
 *           type: string
 *           format: date-time
 *           description: Date d'envoi du message
 */

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Créer un nouveau ticket de support
 *     tags: [Boutique - Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sujet
 *               - description
 *             properties:
 *               sujet:
 *                 type: string
 *                 description: Sujet du ticket
 *                 example: "Problème technique"
 *               description:
 *                 type: string
 *                 description: Description détaillée
 *                 example: "La page d'accueil ne charge pas correctement"
 *               priorite:
 *                 type: string
 *                 enum: [BASSE, MOYENNE, HAUTE, URGENT]
 *                 default: MOYENNE
 *                 description: Niveau de priorité
 *                 example: "HAUTE"
 *     responses:
 *       201:
 *         description: Ticket créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.route('/')
  .post(createTicket);

/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: Liste tous les tickets de la boutique
 *     tags: [Boutique - Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [OUVERT, EN_COURS, RESOLU]
 *         description: Filtrer par statut
 *       - in: query
 *         name: priorite
 *         schema:
 *           type: string
 *           enum: [BASSE, MOYENNE, HAUTE, URGENT]
 *         description: Filtrer par priorité
 *     responses:
 *       200:
 *         description: Liste des tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ticket'
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.route('/')
  .get(getTickets);
router.route('/:id').delete(deleteTicket); // DELETE /tickets/:id
router.route('/:id/status').patch(updateTicketStatus); // PATCH /tickets/:id/status
router.route('/:id/priorite').patch(updateTicketPriority);
/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Obtenir les détails d'un ticket
 *     tags: [Boutique - Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du ticket
 *     responses:
 *       200:
 *         description: Détails du ticket
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Ticket non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', getTicket);

/**
 * @swagger
 * /tickets/{id}/messages:
 *   post:
 *     summary: Ajouter un message à un ticket (Fonctionnalité à venir)
 *     tags: [Boutique - Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du ticket
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Contenu du message
 *                 example: "Voici des informations supplémentaires..."
 *     responses:
 *       501:
 *         description: Fonctionnalité à implémenter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Fonctionnalité à implémenter - Extension du modèle Ticket nécessaire"
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Ticket non trouvé
 */
router.post('/:id/messages', addMessage);

// ===== ROUTES SPÉCIFIQUES (DOIVENT ÊTRE AVANT /:id) =====


module.exports = router;