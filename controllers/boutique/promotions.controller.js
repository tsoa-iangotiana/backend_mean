const Promotion = require('../../models/promotion.model');
const Produit = require('../../models/produit.model');

// @desc    Créer une promotion sur des produits
// @route   POST /api/boutique/promotions
const createPromotion = async (req, res) => {
  try {
    const { produits, reduction, date_debut, date_fin } = req.body;

    // Vérifier que tous les produits appartiennent à la boutique
    const produitsBoutique = await Produit.find({
      _id: { $in: produits },
      boutique: req.boutique._id
    });

    if (produitsBoutique.length !== produits.length) {
      return res.status(403).json({ 
        message: 'Certains produits ne vous appartiennent pas' 
      });
    }

    const promotion = await Promotion.create({
      produits,
      reduction,
      date_debut,
      date_fin
    });

    res.status(201).json(promotion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Liste des promotions de la boutique
// @route   GET /api/boutique/promotions
const getPromotions = async (req, res) => {
  try {
    // Récupérer d'abord les produits de la boutique
    const produits = await Produit.find({ boutique: req.boutique._id }).distinct('_id');
    
    const promotions = await Promotion.find({
      produits: { $in: produits }
    })
    .populate('produits', 'nom prix images')
    .sort('-createdAt');

    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Promotions actives
// @route   GET /api/boutique/promotions/actives
const getPromotionsActives = async (req, res) => {
  try {
    const maintenant = new Date();
    const produits = await Produit.find({ boutique: req.boutique._id }).distinct('_id');
    
    const promotions = await Promotion.find({
      produits: { $in: produits },
      date_debut: { $lte: maintenant },
      date_fin: { $gte: maintenant }
    }).populate('produits', 'nom prix images');

    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Modifier une promotion
// @route   PUT /api/boutique/promotions/:id
const updatePromotion = async (req, res) => {
  try {
    const { reduction, date_debut, date_fin } = req.body;
    
    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    // Vérifier que la boutique possède au moins un produit de la promotion
    const produitTest = promotion.produits[0];
    const produit = await Produit.findOne({
      _id: produitTest,
      boutique: req.boutique._id
    });

    if (!produit) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    promotion.reduction = reduction || promotion.reduction;
    promotion.date_debut = date_debut || promotion.date_debut;
    promotion.date_fin = date_fin || promotion.date_fin;
    
    await promotion.save();
    
    res.json(promotion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer une promotion
// @route   DELETE /api/boutique/promotions/:id
const deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    // Vérification d'appartenance
    const produitTest = promotion.produits[0];
    const produit = await Produit.findOne({
      _id: produitTest,
      boutique: req.boutique._id
    });

    if (!produit) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    await promotion.deleteOne();
    res.json({ message: 'Promotion supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPromotion,
  getPromotions,
  updatePromotion,
  deletePromotion,
  getPromotionsActives
};