const Promotion = require('../../models/promotion.model');
const Produit = require('../../models/produit.model');

// @desc    Créer une promotion sur des produits
// @route   POST /api/boutique/promotions
const createPromotion = async (req, res) => {
  try {
    const { produits, reduction, date_debut, date_fin } = req.body;

    // Validation des données
    if (!produits || !Array.isArray(produits) || produits.length === 0) {
      return res.status(400).json({ 
        message: 'La liste des produits est requise et doit être un tableau non vide' 
      });
    }

    if (!reduction || reduction < 1 || reduction > 100) {
      return res.status(400).json({ 
        message: 'La réduction doit être comprise entre 1 et 100' 
      });
    }

    // Vérifier que les produits existent
    const produitsExistants = await Produit.find({
      _id: { $in: produits }
    });

    if (produitsExistants.length !== produits.length) {
      return res.status(404).json({ 
        message: 'Certains produits n\'existent pas' 
      });
    }

    // Vérifier que les produits appartiennent à la boutique
    if (req.boutique) {
      const produitsBoutique = produitsExistants.filter(
        p => p.boutique.toString() === req.boutique._id.toString()
      );
      
      if (produitsBoutique.length !== produits.length) {
        return res.status(403).json({ 
          message: 'Certains produits ne vous appartiennent pas' 
        });
      }
    }

    // Créer la promotion
    const promotion = await Promotion.create({
      produits,
      reduction: Number(reduction),
      date_debut: date_debut ? new Date(date_debut) : null,
      date_fin: date_fin ? new Date(date_fin) : null
    });

    // Populer les produits pour la réponse
    const promotionPopulee = await Promotion.findById(promotion._id)
      .populate('produits', 'nom prix images categorie actif');

    res.status(201).json(promotionPopulee);
  } catch (error) {
    console.error('❌ Erreur création promotion:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Liste des promotions
// @route   GET /api/boutique/promotions
const getPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.find()
      .populate('produits', 'nom prix images categorie actif')
      .sort('-createdAt');

    res.json(promotions);
  } catch (error) {
    console.error('❌ Erreur récupération promotions:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Promotions actives
// @route   GET /api/boutique/promotions/actives
const getPromotionsActives = async (req, res) => {
  try {
    const maintenant = new Date();
    
    const promotions = await Promotion.find({
      $or: [
        // Promotions sans date de début (actives immédiatement)
        { date_debut: null },
        // Promotions avec date de début déjà passée
        { date_debut: { $lte: maintenant } }
      ],
      $or: [
        // Promotions sans date de fin (permanentes)
        { date_fin: null },
        // Promotions avec date de fin pas encore passée
        { date_fin: { $gte: maintenant } }
      ]
    }).populate('produits', 'nom prix images categorie actif');

    res.json(promotions);
  } catch (error) {
    console.error('❌ Erreur récupération promotions actives:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir une promotion par ID
// @route   GET /api/boutique/promotions/:id
const getPromotionById = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id)
      .populate('produits', 'nom prix images categorie actif');
    
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    res.json(promotion);
  } catch (error) {
    console.error('❌ Erreur récupération promotion:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Modifier une promotion (réduction et dates)
// @route   PUT /api/boutique/promotions/:id
const updatePromotion = async (req, res) => {
  try {
    const { reduction, date_debut, date_fin } = req.body;
    
    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    // Mise à jour des champs
    if (reduction !== undefined) {
      if (reduction < 1 || reduction > 100) {
        return res.status(400).json({ message: 'La réduction doit être entre 1 et 100' });
      }
      promotion.reduction = reduction;
    }
    
    if (date_debut !== undefined) promotion.date_debut = date_debut ? new Date(date_debut) : null;
    if (date_fin !== undefined) promotion.date_fin = date_fin ? new Date(date_fin) : null;
    
    await promotion.save();
    
    const promotionPopulee = await Promotion.findById(promotion._id)
      .populate('produits', 'nom prix images categorie actif');
    
    res.json(promotionPopulee);
  } catch (error) {
    console.error('❌ Erreur mise à jour promotion:', error);
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

    await promotion.deleteOne();
    res.json({ message: 'Promotion supprimée avec succès' });
  } catch (error) {
    console.error('❌ Erreur suppression promotion:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Ajouter des produits à une promotion
// @route   POST /api/boutique/promotions/:id/produits
const addProduitsToPromotion = async (req, res) => {
  try {
    const { produits } = req.body;
    
    if (!produits || !Array.isArray(produits) || produits.length === 0) {
      return res.status(400).json({ 
        message: 'La liste des produits est requise et doit être un tableau non vide' 
      });
    }

    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    // Vérifier que les produits existent
    const produitsExistants = await Produit.find({
      _id: { $in: produits }
    });

    if (produitsExistants.length !== produits.length) {
      return res.status(404).json({ 
        message: 'Certains produits n\'existent pas' 
      });
    }

    // Ajouter les nouveaux produits sans doublons
    const produitsActuels = promotion.produits.map(p => p.toString());
    const nouveauxProduits = produits.filter(
      prod => !produitsActuels.includes(prod)
    );
    
    if (nouveauxProduits.length === 0) {
      return res.status(400).json({ 
        message: 'Tous les produits sont déjà dans cette promotion' 
      });
    }
    
    promotion.produits = [...promotion.produits, ...nouveauxProduits];
    await promotion.save();
    
    const promotionPopulee = await Promotion.findById(promotion._id)
      .populate('produits', 'nom prix images categorie actif');
    
    res.json(promotionPopulee);
  } catch (error) {
    console.error('❌ Erreur ajout produits à la promotion:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Retirer des produits d'une promotion
// @route   DELETE /api/boutique/promotions/:id/produits
const removeProduitsFromPromotion = async (req, res) => {
  try {
    const { produits } = req.body;
    
    if (!produits || !Array.isArray(produits) || produits.length === 0) {
      return res.status(400).json({ 
        message: 'La liste des produits est requise et doit être un tableau non vide' 
      });
    }

    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    // Retirer les produits spécifiés
    const produitsAsString = produits.map(p => p.toString());
    promotion.produits = promotion.produits.filter(
      prod => !produitsAsString.includes(prod.toString())
    );
    
    await promotion.save();
    
    const promotionPopulee = await Promotion.findById(promotion._id)
      .populate('produits', 'nom prix images categorie actif');
    
    res.json(promotionPopulee);
  } catch (error) {
    console.error('❌ Erreur retrait produits de la promotion:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remplacer tous les produits d'une promotion
// @route   PUT /api/boutique/promotions/:id/produits
const updateAllProduitsInPromotion = async (req, res) => {
  try {
    const { produits } = req.body;
    
    if (!produits || !Array.isArray(produits)) {
      return res.status(400).json({ 
        message: 'La liste des produits est requise et doit être un tableau' 
      });
    }

    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    // Si la liste est vide, on ne fait rien
    if (produits.length === 0) {
      return res.status(400).json({ 
        message: 'La promotion doit avoir au moins un produit' 
      });
    }

    // Vérifier que les produits existent
    const produitsExistants = await Produit.find({
      _id: { $in: produits }
    });

    if (produitsExistants.length !== produits.length) {
      return res.status(404).json({ 
        message: 'Certains produits n\'existent pas' 
      });
    }

    // Remplacer tous les produits
    promotion.produits = produits;
    await promotion.save();
    
    const promotionPopulee = await Promotion.findById(promotion._id)
      .populate('produits', 'nom prix images categorie actif');
    
    res.json(promotionPopulee);
  } catch (error) {
    console.error('❌ Erreur remplacement produits:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPromotion,
  getPromotions,
  getPromotionsActives,
  getPromotionById,
  updatePromotion,
  deletePromotion,
  addProduitsToPromotion,
  removeProduitsFromPromotion,
  updateAllProduitsInPromotion
};