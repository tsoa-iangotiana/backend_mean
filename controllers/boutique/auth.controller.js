const User = require('../../models/user.model');
const Boutique = require('../../models/boutique.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Login boutique
// @route   POST /api/boutique/auth/login
const loginBoutique = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier utilisateur
    const user = await User.findOne({ email, role: 'boutique' });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier si boutique active
    const boutique = await Boutique.findOne({ responsable: user._id });
    if (!boutique?.active) {
      return res.status(403).json({ message: 'Boutique désactivée' });
    }

    // Générer token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      boutique: {
        id: boutique._id,
        nom: boutique.nom,
        box: boutique.box,
        note_moyenne: boutique.note_moyenne
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir profil boutique complet
// @route   GET /api/boutique/auth/profil
const getProfilBoutique = async (req, res) => {
  try {
    const boutique = await Boutique.findById(req.boutique._id)
      .populate('box')
      .populate('categories', 'nom valide')
      .populate('responsable', 'username email');

    res.json(boutique);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour profil boutique
// @route   PUT /api/boutique/auth/profil
const updateProfilBoutique = async (req, res) => {
  try {
    const { nom, description, categories } = req.body;
    
    const boutique = await Boutique.findByIdAndUpdate(
      req.boutique._id,
      { nom, description, categories },
      { new: true, runValidators: true }
    ).populate('box categories responsable', '-password');

    res.json(boutique);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { loginBoutique, getProfilBoutique, updateProfilBoutique };