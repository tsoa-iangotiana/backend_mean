const express = require('express');
const router = express.Router();
const {
  payerLoyer,
  getSituationLoyer,
  getHistoriquePaiements
} = require('../../controllers/boutique/paiement.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { estBoutique } = require('../../middlewares/boutique.middleware');

router.use(protect, estBoutique);

router.post('/payer', payerLoyer);
router.get('/situation', getSituationLoyer);
router.get('/historique', getHistoriquePaiements);

module.exports = router;