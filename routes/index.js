const express = require('express');
const router = express.Router();

// Routes boutique
router.use('/boutique/auth', require('./boutique/auth.routes'));
router.use('/boutique/produits', require('./boutique/produits.routes'));
router.use('/boutique/promotions', require('./boutique/promotions.routes'));
router.use('/boutique/commandes', require('./boutique/commandes.routes'));
router.use('/boutique/paiement', require('./boutique/paiement.routes'));
router.use('/boutique/tickets', require('./boutique/tickets.routes'));

module.exports = router;