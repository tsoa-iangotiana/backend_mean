// const express = require('express');
// const router = express.Router();
// const User = require('../models/user.model.js');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const authMiddleware = require('../middlewares/auth.middleware');

// // Validation des entrées
// const validateRegistration = (req, res, next) => {
//   const { username, email, password, role } = req.body;
  
//   if (!username || !email || !password) {
//     return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
//   }
  
//   if (password.length < 6) {
//     return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
//   }
  
//   if (role && !['acheteur', 'boutique', 'admin'].includes(role)) {
//     return res.status(400).json({ message: 'Rôle invalide' });
//   }
  
//   next();
// };

// // Inscription
// router.post('/inscription', validateRegistration, async (req, res) => {
//   const { username, email, password, role } = req.body;

//   try {
//     // Vérifier le nom d'utilisateur
//     const existingUsername = await User.findOne({ username });
//     if (existingUsername) {
//       return res.status(400).json({ message: 'Nom d\'utilisateur déjà utilisé' });
//     }
    
//     const existingUser = await User.findOne({ email });
//     if (existingUser) return res.status(400).json({ message: 'Email déjà utilisé' });

//     // Hash du mot de passe
//     const salt = await bcrypt.genSalt(10);
//     const passwordHash = await bcrypt.hash(password, salt);

//     // Création de l'utilisateur
//     const user = new User({ 
//       username, 
//       email, 
//       password: passwordHash, 
//       role: role || 'acheteur' // Valeur par défaut
//     });
    
//     await user.save();

//     // Retirer le mot de passe de la réponse
//     const userResponse = user.toObject();
//     delete userResponse.password;
    
//     res.status(201).json({ 
//       message: 'Utilisateur créé avec succès',
//       user: userResponse
//     });
//   } catch (err) {
//     console.error('Erreur inscription:', err);
//     res.status(500).json({ message: 'Erreur serveur' });
//   }
// });

// // Connexion - MODIFIÉ pour retourner le token dans la réponse JSON
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;
    
//     // Validation
//     if (!email || !password) {
//       return res.status(400).json({ 
//         success: false,
//         message: 'Email et mot de passe requis' 
//       });
//     }
    
//     // Rechercher l'utilisateur
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ 
//         success: false,
//         message: 'Identifiants incorrects' 
//       });
//     }
    
//     // Vérifier le mot de passe
//     const isPasswordValid = await user.comparePassword(password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ 
//         success: false,
//         message: 'Identifiants incorrects' 
//       });
//     }
    
//     // Vérifier si le compte est actif
//     if (!user.active) {
//       return res.status(403).json({ 
//         success: false,
//         message: 'Compte désactivé' 
//       });
//     }
    
//     // Générer le token JWT
//     const token = jwt.sign(
//       { 
//         userId: user._id,
//         email: user.email,
//         role: user.role 
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
//     );
    
//     // MODIFIÉ: Retourner le token dans la réponse JSON au lieu de définir un cookie
//     res.json({
//       success: true,
//       message: 'Connexion réussie',
//       token, // Token à stocker dans localStorage côté client
//       user: {
//         _id: user._id,
//         username: user.username,
//         email: user.email,
//         role: user.role
//       }
//     });
    
//   } catch (error) {
//     console.error('❌ Erreur login:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Erreur serveur' 
//     });
//   }
// });

// // MODIFIÉ: Déconnexion simplifiée (le client doit supprimer le token du localStorage)
// router.post('/logout', (req, res) => {
//   res.json({ 
//     success: true,
//     message: 'Déconnexion réussie. Veuillez supprimer le token côté client.' 
//   });
// });

// // Lire tous les utilisateurs - Protection admin
// router.get('/users', authMiddleware(['admin']), async (req, res) => {
//   try {
//     const users = await User.find().select('-password');
//     res.json({
//       success: true,
//       users
//     });
//   } catch (error) {
//     res.status(500).json({ 
//       success: false,
//       error: error.message 
//     });
//   }
// });

// // Supprimer un utilisateur par ID - Protection admin
// router.delete('/users/:id', authMiddleware(['admin']), async (req, res) => {
//   try {
//     // Empêcher l'auto-suppression
//     if (req.user._id.toString() === req.params.id) {
//       return res.status(400).json({ 
//         success: false,
//         message: 'Vous ne pouvez pas supprimer votre propre compte' 
//       });
//     }
    
//     const user = await User.findByIdAndDelete(req.params.id);
//     if (!user) return res.status(404).json({ 
//       success: false,
//       message: 'Utilisateur non trouvé' 
//     });
    
//     res.json({ 
//       success: true,
//       message: 'Utilisateur supprimé avec succès' 
//     });
//   } catch (error) {
//     res.status(500).json({ 
//       success: false,
//       message: 'Erreur serveur' 
//     });
//   } 
// });

// // Modifier un utilisateur par ID - Protection et validation
// router.put('/users/:id', authMiddleware(), async (req, res) => {
//   try {
//     // Vérifier les permissions: admin ou proprio du compte
//     if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
//       return res.status(403).json({ 
//         success: false,
//         message: 'Accès refusé' 
//       });
//     }
    
//     const updates = req.body;
    
//     // Empêcher la modification de certains champs selon le rôle
//     if (req.user.role !== 'admin' && updates.role) {
//       return res.status(403).json({ 
//         success: false,
//         message: 'Vous ne pouvez pas modifier votre rôle' 
//       });
//     }
    
//     // Si modification de mot de passe, le hasher
//     if (updates.password) {
//       const salt = await bcrypt.genSalt(10);
//       updates.password = await bcrypt.hash(updates.password, salt);
//     }
    
//     const user = await User.findByIdAndUpdate(
//       req.params.id, 
//       updates, 
//       { new: true, runValidators: true }
//     ).select('-password');
    
//     if (!user) return res.status(404).json({ 
//       success: false,
//       message: 'Utilisateur non trouvé' 
//     });
    
//     res.json({
//       success: true,
//       user
//     });
//   } catch (error) {
//     res.status(500).json({ 
//       success: false,
//       message: 'Erreur serveur' 
//     });
//   }
// });

// // Route pour obtenir son propre profil
// router.get('/me', authMiddleware(), async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).select('-password');
//     res.json({ 
//       success: true,
//       user 
//     });
//   } catch (error) {
//     res.status(500).json({ 
//       success: false,
//       message: 'Erreur serveur' 
//     });
//   }
// });

// module.exports = router;