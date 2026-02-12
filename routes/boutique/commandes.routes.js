const express = require('express');
const router = express.Router();
const {
  getCommandes,
  getChiffreAffaires,
  getStatistiques
} = require('../../controllers/boutique/commandes.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { estBoutique, verifierPaiement } = require('../../middlewares/boutique.middleware');

router.use(protect, estBoutique, verifierPaiement);

router.get('/', getCommandes);
router.get('/chiffre-affaires', getChiffreAffaires);
router.get('/statistiques', getStatistiques);

module.exports = router;