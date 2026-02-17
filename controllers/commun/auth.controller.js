const User = require('../../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Inscription d'un nouvel utilisateur
// @route   POST /inscription
// @access  Public
const inscription = async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    // Validation des entrées
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Tous les champs sont obligatoires' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }
    
    if (role && !['acheteur', 'boutique', 'admin'].includes(role)) {
      return res.status(400).json({ 
        success: false,
        message: 'Rôle invalide' 
      });
    }

    // Vérifier le nom d'utilisateur
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ 
        success: false,
        message: "Nom d'utilisateur déjà utilisé" 
      });
    }
    
    // Vérifier l'email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Email déjà utilisé' 
      });
    }

    // Hash du mot de passe
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Création de l'utilisateur
    const user = new User({ 
      username, 
      email, 
      password: passwordHash, 
      role: role || 'acheteur' // Valeur par défaut
    });
    
    await user.save();

    // Retirer le mot de passe de la réponse
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json({ 
      success: true,
      message: 'Utilisateur créé avec succès',
      user: userResponse
    });
  } catch (err) {
    console.error('❌ Erreur inscription:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de l\'inscription' 
    });
  }
};

// @desc    Connexion utilisateur
// @route   POST /api/users/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email et mot de passe requis' 
      });
    }
    
    // Rechercher l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Identifiants introuvables' 
      });
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Mot de passe incorrect' 
      });
    }
    
    // Vérifier si le compte est actif
    if (!user.active) {
      return res.status(403).json({ 
        success: false,
        message: 'Compte désactivé' 
      });
    }
    
    // Générer le token JWT
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    // Retourner le token dans la réponse
    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur login:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de la connexion', error  
    });
  }
};

// @desc    Déconnexion utilisateur
// @route   POST /api/users/logout
// @access  Private
const logout = (req, res) => {
  // Le logout est géré côté client en supprimant le token
  res.json({ 
    success: true,
    message: 'Déconnexion réussie'
  });
};

// @desc    Obtenir son propre profil
// @route   GET /api/users/me
// @access  Private
const getMonProfil = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('boutique', 'nom active');
      
    res.json({ 
      success: true,
      user 
    });
  } catch (error) {
    console.error('❌ Erreur getMonProfil:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// @desc    Obtenir tous les utilisateurs
// @route   GET /api/users
// @access  Private (Admin seulement)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, actif, search } = req.query;
    
    // Construction du filtre
    const filter = {};
    if (role) filter.role = role;
    if (actif !== undefined) filter.active = actif === 'true';
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(filter)
      .select('-password')
      .populate('boutique', 'nom')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(filter);
    
    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Erreur getAllUsers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// @desc    Obtenir un utilisateur par ID
// @route   GET /api/users/:id
// @access  Private (Admin ou proprio)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id)
      .select('-password')
      .populate('boutique', 'nom active');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ Erreur getUserById:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// @desc    Modifier un utilisateur
// @route   PUT /api/users/:id
// @access  Private (Admin ou proprio)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Vérifier les permissions (admin ou proprio)
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ 
        success: false,
        message: 'Accès refusé' 
      });
    }
    
    // Empêcher la modification de certains champs selon le rôle
    if (req.user.role !== 'admin') {
      // Un non-admin ne peut pas modifier son rôle
      if (updates.role) {
        return res.status(403).json({ 
          success: false,
          message: 'Vous ne pouvez pas modifier votre rôle' 
        });
      }
      
      // Un non-admin ne peut pas désactiver son compte
      if (updates.active === false) {
        return res.status(403).json({ 
          success: false,
          message: 'Vous ne pouvez pas désactiver votre compte' 
        });
      }
    }
    
    // Si modification de mot de passe, le hasher
    if (updates.password) {
      if (updates.password.length < 6) {
        return res.status(400).json({ 
          success: false,
          message: 'Le mot de passe doit contenir au moins 6 caractères' 
        });
      }
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }
    
    // Empêcher la modification de l'email si déjà utilisé
    if (updates.email) {
      const existingUser = await User.findOne({ 
        email: updates.email,
        _id: { $ne: id }
      });
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          message: 'Email déjà utilisé' 
        });
      }
    }
    
    // Empêcher la modification du username si déjà utilisé
    if (updates.username) {
      const existingUser = await User.findOne({ 
        username: updates.username,
        _id: { $ne: id }
      });
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          message: "Nom d'utilisateur déjà utilisé" 
        });
      }
    }
    
    const user = await User.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      user
    });
  } catch (error) {
    console.error('❌ Erreur updateUser:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// @desc    Supprimer un utilisateur
// @route   DELETE /api/users/:id
// @access  Private (Admin seulement)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Empêcher l'auto-suppression
    if (req.user._id.toString() === id) {
      return res.status(400).json({ 
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte' 
      });
    }
    
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Utilisateur supprimé avec succès' 
    });
  } catch (error) {
    console.error('❌ Erreur deleteUser:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// @desc    Désactiver/Réactiver un utilisateur
// @route   PATCH /api/users/:id/toggle-active
// @access  Private (Admin seulement)
const toggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Empêcher l'auto-désactivation
    if (req.user._id.toString() === id) {
      return res.status(400).json({ 
        success: false,
        message: 'Vous ne pouvez pas modifier votre propre statut' 
      });
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    user.active = !user.active;
    await user.save();
    
    res.json({
      success: true,
      message: `Utilisateur ${user.active ? 'activé' : 'désactivé'} avec succès`,
      active: user.active
    });
  } catch (error) {
    console.error('❌ Erreur toggleUserActive:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// @desc    Changer le mot de passe
// @route   POST /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' 
      });
    }
    
    // Récupérer l'utilisateur avec son mot de passe
    const user = await User.findById(userId);
    
    // Vérifier l'ancien mot de passe
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Mot de passe actuel incorrect' 
      });
    }
    
    // Hasher et sauvegarder le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur changePassword:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

module.exports = {
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
};