const User = require('../../models/user.model');
const Boutique = require('../../models/boutique.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Login utilisateur (tous types)
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier si compte actif
    if (!user.active) {
      return res.status(403).json({ message: 'Compte désactivé' });
    }

    // Vérifier mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Générer token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Préparer réponse de base
    const response = {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        active: user.active
      }
    };

    // Ajouter infos boutique si l'utilisateur est responsable d'une boutique
    if (user.role === 'boutique') {
      const boutique = await Boutique.findOne({ responsable: user._id });
      if (boutique) {
        response.boutique = {
          id: boutique._id,
          nom: boutique.nom,
          box: boutique.box,
          note_moyenne: boutique.note_moyenne,
          active: boutique.active
        };
      }
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Inscription utilisateur
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, email, password, role = 'acheteur' } = req.body;

    // Vérifier si l'utilisateur existe déjà
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

    // Créer l'utilisateur
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      active: role === 'admin' ? true : true // Les admins sont actifs par défaut
    });

    // Générer token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        active: user.active
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { login, register };