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

/**
@swagger
 * /auth/login:
 *   post:
 *     summary: Connexion d’un utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Connexion réussie et retourne le token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Email ou mot de passe incorrect
 */
router.post('/login', login);
router.post('/inscription', inscription);
// Routes protégées
// router.use(authMiddleware);

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