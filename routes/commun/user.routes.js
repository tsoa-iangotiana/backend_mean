const express = require('express');
const router = express.Router();
const {
inscription,
  login,
  logout,
  getMonProfil,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserActive,
  changePassword
} = require('../../controllers/commun/auth.controller');

const authMiddleware = require('../../middlewares/auth.middleware');

router.post('/login', login);
router.post('/inscription', authMiddleware(['admin', 'acheteur']), inscription);
// Routes protégées
router.use(authMiddleware);

// Profil personnel
router.get('/profile', getMonProfil);
router.put('/profile', updateUser);
router.put('/:id/change-password', changePassword);
router.post('/logout', authMiddleware, logout);
// Routes admin uniquement
router.get('/all-users', authMiddleware(['admin']), getAllUsers);
router.get('/user/:id', authMiddleware(['admin']), getUserById);
router.put('/user/:id', authMiddleware(['admin']), updateUser);
router.delete('/user/:id', authMiddleware(['admin']), deleteUser);
router.patch('/user/:id/toggle-active', authMiddleware(['admin']), toggleUserActive);

module.exports = router;