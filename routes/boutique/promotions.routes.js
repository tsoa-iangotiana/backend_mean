const express = require('express');
const router = express.Router();
const {
  createPromotion,
  getPromotions,
  updatePromotion,
  deletePromotion,
  getPromotionsActives
} = require('../../controllers/boutique/promotions.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { estBoutique, verifierPaiement } = require('../../middlewares/boutique.middleware');

router.use(authMiddleware(['boutique']), verifierPaiement);

router.route('/')
  .post(createPromotion)
  .get(getPromotions);

router.get('/actives', getPromotionsActives);
router.route('/:id')
  .put(updatePromotion)
  .delete(deletePromotion);

module.exports = router;