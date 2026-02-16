const User = require('../../models/user.model');
const Boutique = require('../../models/boutique.model');
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