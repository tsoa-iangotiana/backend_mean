const User = require('../../models/user.model');
const bcrypt = require('bcryptjs');

// @desc    Obtenir tous les utilisateurs
// @route   GET /api/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir un utilisateur par ID
// @route   GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Créer un utilisateur (admin)
// @route   POST /api/users
const createUser = async (req, res) => {
  try {
    const { username, email, password, role, active } = req.body;

    // Vérifier si l'utilisateur existe
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email ou nom d\'utilisateur déjà utilisé' 
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      active: active !== undefined ? active : true
    });

    res.status(201).json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour un utilisateur
// @route   PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { username, email, role, active, password } = req.body;
    
    // Vérifier si l'utilisateur existe
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier si email/username déjà pris par un autre utilisateur
    if (email || username) {
      const existingUser = await User.findOne({
        $and: [
          { _id: { $ne: req.params.id } },
          { $or: [
            ...(email ? [{ email }] : []),
            ...(username ? [{ username }] : [])
          ]}
        ]
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Email ou nom d\'utilisateur déjà utilisé' 
        });
      }
    }

    // Construire l'objet de mise à jour
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (active !== undefined) updateData.active = active;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Mettre à jour l'utilisateur
    user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer un utilisateur
// @route   DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Empêcher la suppression de son propre compte
    if (req.user.id === user._id.toString()) {
      return res.status(400).json({ 
        message: 'Vous ne pouvez pas supprimer votre propre compte' 
      });
    }

    await user.deleteOne();
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Activer/Désactiver un utilisateur
// @route   PATCH /api/users/:id/toggle-active
const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Empêcher la désactivation de son propre compte
    if (req.user.id === user._id.toString()) {
      return res.status(400).json({ 
        message: 'Vous ne pouvez pas modifier l\'état de votre propre compte' 
      });
    }

    user.active = !user.active;
    await user.save();

    res.json({
      id: user._id,
      active: user.active,
      message: `Compte ${user.active ? 'activé' : 'désactivé'} avec succès`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Changer le mot de passe
// @route   PUT /api/users/:id/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Vérifier que c'est le propriétaire du compte ou un admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Non autorisé à changer ce mot de passe' 
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier l'ancien mot de passe (sauf pour admin)
    if (req.user.role !== 'admin') {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
      }
    }

    // Hasher et sauvegarder le nouveau mot de passe
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Mot de passe changé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir son profil
// @route   GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour son profil
// @route   PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    
    // Vérifier si email/username déjà pris
    if (email || username) {
      const existingUser = await User.findOne({
        $and: [
          { _id: { $ne: req.user.id } },
          { $or: [
            ...(email ? [{ email }] : []),
            ...(username ? [{ username }] : [])
          ]}
        ]
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Email ou nom d\'utilisateur déjà utilisé' 
        });
      }
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserActive,
  changePassword,
  getProfile,
  updateProfile
};