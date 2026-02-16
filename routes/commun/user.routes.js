const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserActive,
  changePassword,
  getProfile,
  updateProfile
} = require('../controllers/commun/user.controller');

const authMiddleware = require('../../middlewares/auth.middleware');

// Routes protégées
router.use(authMiddleware);

// Profil personnel
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/:id/change-password', changePassword);

// Routes admin uniquement
router.get('/', authMiddleware(['admin']), getUsers);
router.post('/', authMiddleware(['admin']), createUser);
router.get('/:id', authMiddleware(['admin']), getUserById);
router.put('/:id', authMiddleware(['admin']), updateUser);
router.delete('/:id', authMiddleware(['admin']), deleteUser);
router.patch('/:id/toggle-active', authMiddleware(['admin']), toggleUserActive);

module.exports = router;