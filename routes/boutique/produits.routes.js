const express = require('express');
const router = express.Router();
const {
  createProduit,
  getProduits,
  getProduit,
  updateProduit,
  deleteProduit,
  getSituationStock,
  updateStock
} = require('../../controllers/boutique/produits.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { estBoutique, verifierPaiement } = require('../../middlewares/boutique.middleware');

router.use(protect, estBoutique, verifierPaiement);

router.route('/')
  .post(createProduit)
  .get(getProduits);

router.route('/:id')
  .get(getProduit)
  .put(updateProduit)
  .delete(deleteProduit);

router.get('/:id/stock', getSituationStock);
router.put('/:id/stock', updateStock);

module.exports = router;