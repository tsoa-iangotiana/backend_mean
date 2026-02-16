const express = require('express');
const router = express.Router();
const { login } = require('../../controllers/commun/auth.controller');
const {
  getProfilBoutique,
  updateProfilBoutique
} = require('../../controllers/boutique/auth.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { estBoutique } = require('../../middlewares/boutique.middleware');

router.post('/login', login);
router.get('/profil', authMiddleware(['boutique']), getProfilBoutique);
router.put('/profil', authMiddleware(['boutique']), updateProfilBoutique);

module.exports = router;