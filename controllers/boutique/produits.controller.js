const Produit = require('../../models/produit.model');
const mongoose = require('mongoose');

// @desc    Insérer plusieurs produits avec images
// @route   POST /api/boutique/produits
const createProduit = async (req, res) => {
  try {
    const { produits } = req.body; // Accepte un tableau de produits

    if (!Array.isArray(produits)) {
      return res.status(400).json({ message: 'Format: tableau de produits requis' });
    }

    const produitsAvecBoutique = produits.map(produit => ({
      ...produit,
      boutique: req.boutique._id,
      images: produit.images || [] // URLs des images
    }));

    const nouveauxProduits = await Produit.insertMany(produitsAvecBoutique);
    
    res.status(201).json({
      message: `${nouveauxProduits.length} produit(s) ajouté(s)`,
      produits: nouveauxProduits
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir tous les produits de la boutique
// @route   GET /api/boutique/produits
const getProduits = async (req, res) => {
  try {
    const { page = 1, limit = 20, actif, categorie, search } = req.query;
    
    let query = { boutique: req.boutique._id };
    
    if (actif !== undefined) query.actif = actif === 'true';
    if (categorie) query.categorie = categorie;
    if (search) {
      query.nom = { $regex: search, $options: 'i' };
    }

    const produits = await Produit.find(query)
      .populate('categorie', 'nom')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort('-createdAt');

    const total = await Produit.countDocuments(query);

    res.json({
      produits,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir un produit
// @route   GET /api/boutique/produits/:id
const getProduit = async (req, res) => {
  try {
    const produit = await Produit.findOne({
      _id: req.params.id,
      boutique: req.boutique._id
    }).populate('categorie');

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json(produit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour un produit
// @route   PUT /api/boutique/produits/:id
const updateProduit = async (req, res) => {
  try {
    const { nom, description, prix, unite, stock, images, categorie, actif } = req.body;

    const produit = await Produit.findOneAndUpdate(
      { _id: req.params.id, boutique: req.boutique._id },
      { nom, description, prix, unite, stock, images, categorie, actif },
      { new: true, runValidators: true }
    );

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json(produit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer un produit
// @route   DELETE /api/boutique/produits/:id
const deleteProduit = async (req, res) => {
  try {
    const produit = await Produit.findOneAndDelete({
      _id: req.params.id,
      boutique: req.boutique._id
    });

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Situation de stock d'un produit
// @route   GET /api/boutique/produits/:id/stock
const getSituationStock = async (req, res) => {
  try {
    const produit = await Produit.findOne({
      _id: req.params.id,
      boutique: req.boutique._id
    });

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    const seuilAlerte = 10;
    
    res.json({
      produit_id: produit._id,
      nom: produit.nom,
      stock_actuel: produit.stock,
      unite: produit.unite,
      alerte_stock: produit.stock <= seuilAlerte,
      seuil_alerte: seuilAlerte,
      statut: produit.stock === 0 ? 'RUPTURE' : produit.stock <= seuilAlerte ? 'FAIBLE' : 'NORMAL'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour le stock
// @route   PUT /api/boutique/produits/:id/stock
const updateStock = async (req, res) => {
  try {
    const { quantite, operation } = req.body; // operation: 'SET', 'ADD', 'SUBTRACT'

    let produit = await Produit.findOne({
      _id: req.params.id,
      boutique: req.boutique._id
    });

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    let nouveauStock = produit.stock;
    
    switch(operation) {
      case 'ADD':
        nouveauStock += quantite;
        break;
      case 'SUBTRACT':
        nouveauStock = Math.max(0, produit.stock - quantite);
        break;
      default: // SET
        nouveauStock = quantite;
    }

    produit.stock = nouveauStock;
    await produit.save();

    res.json({
      message: 'Stock mis à jour',
      produit: {
        id: produit._id,
        nom: produit.nom,
        stock: produit.stock
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduit,
  getProduits,
  getProduit,
  updateProduit,
  deleteProduit,
  getSituationStock,
  updateStock
};