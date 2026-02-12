const express = require('express');
const router = express.Router();
const {
  loginBoutique,
  getProfilBoutique,
  updateProfilBoutique
} = require('../../controllers/boutique/auth.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { estBoutique } = require('../../middlewares/boutique.middleware');

router.post('/login', loginBoutique);
router.get('/profil', protect, estBoutique, getProfilBoutique);
router.put('/profil', protect, estBoutique, updateProfilBoutique);

module.exports = router;