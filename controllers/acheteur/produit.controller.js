const Produit = require('../../models/produit.model');

// @desc    Obtenir les produits d'une boutique
// @route   GET /api/boutiques/:boutiqueId/produits
const getProduitsByBoutique = async (req, res) => {
  try {
    const {
      categorie,
      prix_min,
      prix_max,
      en_stock,
      search,
      tri,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {
      boutique: req.params.boutiqueId,
      actif: true
    };

    if (categorie) filter.categorie = categorie;
    if (prix_min || prix_max) {
      filter.prix = {};
      if (prix_min) filter.prix.$gte = parseFloat(prix_min);
      if (prix_max) filter.prix.$lte = parseFloat(prix_max);
    }
    if (en_stock === 'true') filter.stock = { $gt: 0 };
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let sort = {};
    switch (tri) {
      case 'prix_asc': sort = { prix: 1 }; break;
      case 'prix_desc': sort = { prix: -1 }; break;
      case 'note': sort = { note_moyenne: -1 }; break;
      case 'popularite': sort = { vendus: -1 }; break;
      case 'nouveaute': sort = { createdAt: -1 }; break;
      default: sort = { note_moyenne: -1, vendus: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const produits = await Produit.find(filter)
      .populate('categorie', 'nom')
      .select('nom prix description images note_moyenne stock')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Produit.countDocuments(filter);

    res.json({
      produits,
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

// @desc    Obtenir un produit par ID
// @route   GET /api/produits/:id
const getProduitById = async (req, res) => {
  try {
    const produit = await Produit.findOne({
      _id: req.params.id,
      actif: true
    })
      .populate('boutique', 'nom note_moyenne')
      .populate('categorie', 'nom');

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    // Produits similaires
    const produitsSimilaires = await Produit.find({
      _id: { $ne: produit._id },
      boutique: produit.boutique._id,
      categorie: produit.categorie,
      actif: true,
      stock: { $gt: 0 }
    })
      .limit(4)
      .select('nom prix images note_moyenne');

    res.json({
      produit,
      produits_similaires: produitsSimilaires
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Vérifier disponibilité d'un produit
// @route   GET /api/produits/:id/disponibilite
const checkDisponibilite = async (req, res) => {
  try {
    const { quantite = 1 } = req.query;

    const produit = await Produit.findOne({
      _id: req.params.id,
      actif: true
    });

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    const disponible = produit.stock >= parseInt(quantite);

    res.json({
      produit: produit.nom,
      disponible,
      stock_actuel: produit.stock,
      quantite_max: Math.min(produit.stock, 10),
      message: disponible ? '✅ Produit disponible' : '❌ Stock insuffisant'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProduitsByBoutique,  // ✅ Acheteur peut lister les produits
  getProduitById,         // ✅ Acheteur peut voir un produit
  checkDisponibilite      // ✅ Acheteur peut vérifier le stock
  // ❌ PAS de create, update, delete pour l'acheteur
};