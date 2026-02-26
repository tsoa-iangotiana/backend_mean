const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicket,
  getTicketStats,
  getAdminTicketStats,
  searchTickets,
  getTicketsByStatus,
  getTicketsByPriority,
  updateTicketStatus,
  updateTicketPriority,
  getAllTickets,
  addCommentaire,
  addSystemComment,
  getCommentaires,
  deleteCommentaire,
  deleteTicket
} = require('../../controllers/boutique/tickets.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { estBoutique } = require('../../middlewares/boutique.middleware');

router.use(authMiddleware(['boutique','admin']));

/**
 * @swagger
 * tags:
 *   name: Boutique - Tickets
 *   description: Gestion des tickets de support pour les boutiques
 */
// ===== ROUTES POUR LES COMMENTAIRES =====
router.get('/admin/stats', authMiddleware(['admin']), getAdminTicketStats);
/**
 * @swagger
 * /tickets/{id}/commentaires:
 *   post:
 *     summary: Ajouter un commentaire à un ticket
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
 *       - in: query
 *         name: boutiqueId
 *         schema:
 *           type: string
 *         description: ID de la boutique (si appelé par une boutique)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - texte
 *             properties:
 *               texte:
 *                 type: string
 *                 description: Contenu du commentaire
 *                 example: "Voici des informations supplémentaires..."
 *     responses:
 *       201:
 *         description: Commentaire ajouté avec succès
 *       400:
 *         description: Texte requis
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Ticket non trouvé
 */
router.post('/:id/commentaires', addCommentaire);

/**
 * @swagger
 * /tickets/{id}/commentaires:
 *   get:
 *     summary: Récupérer tous les commentaires d'un ticket
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
 *       - in: query
 *         name: boutiqueId
 *         schema:
 *           type: string
 *         description: ID de la boutique (pour vérification)
 *     responses:
 *       200:
 *         description: Liste des commentaires
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Ticket non trouvé
 */
router.get('/:id/commentaires', getCommentaires);

/**
 * @swagger
 * /tickets/{ticketId}/commentaires/{commentaireId}:
 *   delete:
 *     summary: Supprimer un commentaire (admin uniquement)
 *     tags: [Boutique - Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du ticket
 *       - in: path
 *         name: commentaireId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du commentaire
 *     responses:
 *       200:
 *         description: Commentaire supprimé avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (admin uniquement)
 *       404:
 *         description: Ticket non trouvé
 */
router.delete('/:ticketId/commentaires/:commentaireId', authMiddleware(['admin']), deleteCommentaire);

/**
 * @swagger
 * /tickets/{id}/commentaires/systeme:
 *   post:
 *     summary: Ajouter un commentaire système (admin uniquement)
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               texte:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [commentaire, resolution, reouverture]
 *     responses:
 *       201:
 *         description: Commentaire système ajouté
 */
router.post('/:id/commentaires/systeme', authMiddleware(['admin']), addSystemComment);
router.route('/all').get(getAllTickets); // GET /tickets/all pour tous les tickets sans pagination
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
/**
 * @swagger
 * /ticket/{id}/priorite:
 *   patch:
 *     summary: Mettre à jour la priorité d'un ticket
 *     description: Permet de modifier le niveau de priorité d'un ticket de support
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 699d529e725ac7435b87d927
 *         description: ID unique du ticket à modifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priorite
 *             properties:
 *               priorite:
 *                 type: string
 *                 enum: [BASSE, MOYENNE, HAUTE, URGENT]
 *                 example: URGENT
 *                 description: Nouveau niveau de priorité du ticket
 *           examples:
 *             basse:
 *               summary: Priorité basse
 *               value:
 *                 priorite: BASSE
 *             moyenne:
 *               summary: Priorité moyenne
 *               value:
 *                 priorite: MOYENNE
 *             haute:
 *               summary: Priorité haute
 *               value:
 *                 priorite: HAUTE
 *             urgent:
 *               summary: Priorité urgente
 *               value:
 *                 priorite: URGENT
 *     responses:
 *       200:
 *         description: Priorité mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: 699d529e725ac7435b87d927
 *                 sujet:
 *                   type: string
 *                   example: "Les toilettes sont bouchées"
 *                 description:
 *                   type: string
 *                   example: "Les eaux se refoulent"
 *                 statut:
 *                   type: string
 *                   enum: [OUVERT, EN_COURS, RESOLU]
 *                   example: OUVERT
 *                 priorite:
 *                   type: string
 *                   enum: [BASSE, MOYENNE, HAUTE, URGENT]
 *                   example: URGENT
 *                 boutique:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 699b61298f7a5244ae1c9bb0
 *                     nom:
 *                       type: string
 *                       example: "Boutique misy sary"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-02-24T07:26:22.820Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-02-25T10:30:00.000Z"
 *             example:
 *               _id: "699d529e725ac7435b87d927"
 *               sujet: "Les toilettes sont bouchées"
 *               description: "Les eaux se refoulent"
 *               statut: "OUVERT"
 *               priorite: "URGENT"
 *               boutique:
 *                 _id: "699b61298f7a5244ae1c9bb0"
 *                 nom: "Boutique misy sary"
 *               createdAt: "2026-02-24T07:26:22.820Z"
 *               updatedAt: "2026-02-25T10:30:00.000Z"
 *       400:
 *         description: Requête invalide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "La priorité est requise"
 *             examples:
 *               missingPriority:
 *                 summary: Priorité manquante
 *                 value:
 *                   message: "La priorité est requise"
 *               invalidPriority:
 *                 summary: Priorité invalide
 *                 value:
 *                   message: "Priorité invalide. Valeurs acceptées: BASSE, MOYENNE, HAUTE, URGENT"
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Token manquant ou invalide"
 *       403:
 *         description: Accès non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vous n'êtes pas autorisé à modifier ce ticket"
 *       404:
 *         description: Ticket non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ticket non trouvé"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur interne du serveur"
 */
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



// ===== ROUTES SPÉCIFIQUES (DOIVENT ÊTRE AVANT /:id) =====


module.exports = router;