const Boutique = require('../../models/boutique.model');

// @desc    Obtenir toutes les boutiques actives
// @route   GET /api/boutiques
const getBoutiques = async (req, res) => {
  try {
    const {
      search,
      categorie,
      note_min,
      tri,
      page = 1,
      limit = 20
    } = req.query;

    const filter = { active: true };
    
    if (search) filter.nom = { $regex: search, $options: 'i' };
    if (categorie) filter.categories = categorie;
    if (note_min) filter.note_moyenne = { $gte: parseFloat(note_min) };

    let sort = {};
    switch (tri) {
      case 'note': sort = { note_moyenne: -1 }; break;
      case 'nouveaute': sort = { createdAt: -1 }; break;
      case 'nom': sort = { nom: 1 }; break;
      default: sort = { note_moyenne: -1, createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const boutiques = await Boutique.find(filter)
      .populate('responsable', 'username')
      .populate('box', 'nom adresse')
      .populate('categories', 'nom')
      .select('nom description box note_moyenne categories createdAt')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Boutique.countDocuments(filter);

    res.json({
      boutiques,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir une boutique par ID
// @route   GET /api/boutiques/:id
const getBoutiqueById = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({
      _id: req.params.id,
      active: true
    })
      .populate('responsable', 'username')
      .populate('box', 'nom adresse')
      .populate('categories', 'nom description');

    if (!boutique) {
      return res.status(404).json({ message: 'Boutique non trouvée' });
    }

    res.json(boutique);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getBoutiques,      // ✅ Acheteur peut lister les boutiques
  getBoutiqueById    // ✅ Acheteur peut voir une boutique
  // ❌ PAS de create, update, delete, toggle pour l'acheteur
};