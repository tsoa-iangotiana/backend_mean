const express = require('express');
const router = express.Router();
const {
  payerLoyer,
  getSituationLoyer,
  getHistoriquePaiements
} = require('../../controllers/boutique/paiement.controller');
const authMiddleware  = require('../../middlewares/auth.middleware');
const { estBoutique } = require('../../middlewares/boutique.middleware');

router.use(authMiddleware(['boutique']));

/**
 * @swagger
 * tags:
 *   name: Loyer
 *   description: Gestion des paiements de loyer pour les boutiques
 */

/**
 * @swagger
 * /loyer/payer:
 *   post:
 *     summary: Effectuer un paiement de loyer
 *     tags: [Loyer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               periode:
 *                 type: string
 *                 enum: [mensuel, trimestriel, annuel]
 *                 description: Période de paiement
 *                 example: mensuel
 *               montant:
 *                 type: number
 *                 description: Montant payé (optionnel, par défaut celui du box)
 *                 example: 150000
 *     responses:
 *       201:
 *         description: Paiement enregistré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 paiement:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     montant:
 *                       type: number
 *                     date_fin:
 *                       type: string
 *                       format: date
 *                     periode:
 *                       type: string
 *       400:
 *         description: Données invalides ou box non assigné
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.post('/payer', payerLoyer);

/**
 * @swagger
 * /loyer/situation:
 *   get:
 *     summary: Obtenir la situation actuelle du loyer
 *     tags: [Loyer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Situation du loyer récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 boutique:
 *                   type: string
 *                 box:
 *                   type: string
 *                 loyer_mensuel:
 *                   type: number
 *                 situation:
 *                   type: object
 *                   properties:
 *                     statut:
 *                       type: string
 *                       enum: [A_JOUR, RETARD]
 *                     dernier_paiement:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     prochaine_echeance:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     jours_restants:
 *                       type: number
 *                     periode_en_cours:
 *                       type: string
 *                       nullable: true
 *                     montant_paye:
 *                       type: number
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/situation', getSituationLoyer);

/**
 * @swagger
 * /loyer/historique:
 *   get:
 *     summary: Obtenir l'historique des paiements
 *     tags: [Loyer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historique récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_paiements:
 *                   type: integer
 *                 montant_total:
 *                   type: number
 *                 paiements:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       montant:
 *                         type: number
 *                       date_paiement:
 *                         type: string
 *                         format: date
 *                       date_fin:
 *                         type: string
 *                         format: date
 *                       periode:
 *                         type: string
 *                       statut:
 *                         type: string
 *                         enum: [ACTIF, EXPIRE]
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/historique', getHistoriquePaiements);

module.exports = router;