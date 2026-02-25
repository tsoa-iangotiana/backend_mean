const Favoris = require('../../models/favoris.model');
const Produit = require('../../models/produit.model');
const Boutique = require('../../models/boutique.model');
const mongoose = require('mongoose');

/**
 * @desc    Récupérer les favoris de l'utilisateur connecté
 * @route   GET /favoris
 * @access  Private
 */
const getFavoris = async (req, res) => {
  try {
    const utilisateurId = req.user._id;

    let favoris = await Favoris.findOne({ utilisateur: utilisateurId })
      .populate('produits', 'nom prix images note_moyenne actif')
      .populate({
        path: 'boutiques',
        populate: [
          { path: 'box', select: 'numero surface' },
          { path: 'categories', select: 'nom' }
        ]
      });

    // Si l'utilisateur n'a pas encore de document favoris, en créer un vide
    if (!favoris) {
      favoris = new Favoris({
        utilisateur: utilisateurId,
        produits: [],
        boutiques: []
      });
      await favoris.save();
    }

    res.status(200).json({
      success: true,
      favoris: {
        produits: favoris.produits,
        boutiques: favoris.boutiques
      }
    });

  } catch (error) {
    console.error('❌ Erreur getFavoris:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des favoris'
    });
  }
};

/**
 * @desc    Ajouter/Retirer une boutique des favoris (toggle)
 * @route   POST /favoris/boutique/:boutiqueId
 * @access  Private
 */
const toggleBoutiqueFavoris = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const utilisateurId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(boutiqueId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boutique invalide'
      });
    }

    // Vérifier que la boutique existe et est active
    const boutique = await Boutique.findOne({ 
      _id: boutiqueId, 
      active: true 
    });

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée ou inactive'
      });
    }

    // Chercher ou créer le document favoris de l'utilisateur
    let favoris = await Favoris.findOne({ utilisateur: utilisateurId });

    if (!favoris) {
      favoris = new Favoris({
        utilisateur: utilisateurId,
        produits: [],
        boutiques: []
      });
    }

    // Vérifier si la boutique est déjà en favoris
    const boutiqueIndex = favoris.boutiques.findIndex(
      id => id.toString() === boutiqueId
    );

    let message = '';
    let estFavoris = false;

    if (boutiqueIndex === -1) {
      // Ajouter aux favoris
      favoris.boutiques.push(new mongoose.Types.ObjectId(boutiqueId));
      message = 'Boutique ajoutée aux favoris';
      estFavoris = true;
    } else {
      // Retirer des favoris
      favoris.boutiques.splice(boutiqueIndex, 1);
      message = 'Boutique retirée des favoris';
      estFavoris = false;
    }

    await favoris.save();

    res.status(200).json({
      success: true,
      message,
      estFavoris,
      boutique: {
        _id: boutiqueId,
        nom: boutique.nom
      }
    });

  } catch (error) {
    console.error('❌ Erreur toggleBoutiqueFavoris:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification des favoris'
    });
  }
};

/**
 * @desc    Ajouter/Retirer un produit des favoris (toggle)
 * @route   POST /favoris/produit/:produitId
 * @access  Private
 */
const toggleProduitFavoris = async (req, res) => {
  try {
    const { produitId } = req.params;
    const utilisateurId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(produitId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de produit invalide'
      });
    }

    // Vérifier que le produit existe et est actif
    const produit = await Produit.findOne({ 
      _id: produitId, 
      actif: true 
    });

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé ou inactif'
      });
    }

    // Chercher ou créer le document favoris de l'utilisateur
    let favoris = await Favoris.findOne({ utilisateur: utilisateurId });

    if (!favoris) {
      favoris = new Favoris({
        utilisateur: utilisateurId,
        produits: [],
        boutiques: []
      });
    }

    // Vérifier si le produit est déjà en favoris
    const produitIndex = favoris.produits.findIndex(
      id => id.toString() === produitId
    );

    let message = '';
    let estFavoris = false;

    if (produitIndex === -1) {
      // Ajouter aux favoris
      favoris.produits.push(new mongoose.Types.ObjectId(produitId));
      message = 'Produit ajouté aux favoris';
      estFavoris = true;
    } else {
      // Retirer des favoris
      favoris.produits.splice(produitIndex, 1);
      message = 'Produit retiré des favoris';
      estFavoris = false;
    }

    await favoris.save();

    res.status(200).json({
      success: true,
      message,
      estFavoris,
      produit: {
        _id: produitId,
        nom: produit.nom
      }
    });

  } catch (error) {
    console.error('❌ Erreur toggleProduitFavoris:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification des favoris'
    });
  }
};

/**
 * @desc    Vérifier si une boutique est en favoris
 * @route   GET /favoris/check/boutique/:boutiqueId
 * @access  Private
 */
const checkBoutiqueFavoris = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const utilisateurId = req.user._id;

    const favoris = await Favoris.findOne({ 
      utilisateur: utilisateurId,
      boutiques: boutiqueId
    });

    res.status(200).json({
      success: true,
      estFavoris: !!favoris
    });

  } catch (error) {
    console.error('❌ Erreur checkBoutiqueFavoris:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification'
    });
  }
};

/**
 * @desc    Vérifier si un produit est en favoris
 * @route   GET /favoris/check/produit/:produitId
 * @access  Private
 */
const checkProduitFavoris = async (req, res) => {
  try {
    const { produitId } = req.params;
    const utilisateurId = req.user._id;

    const favoris = await Favoris.findOne({ 
      utilisateur: utilisateurId,
      produits: produitId
    });

    res.status(200).json({
      success: true,
      estFavoris: !!favoris
    });

  } catch (error) {
    console.error('❌ Erreur checkProduitFavoris:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification'
    });
  }
};

/**
 * @desc    Supprimer tous les favoris d'un utilisateur
 * @route   DELETE /favoris
 * @access  Private
 */
const clearFavoris = async (req, res) => {
  try {
    const utilisateurId = req.user._id;

    await Favoris.findOneAndUpdate(
      { utilisateur: utilisateurId },
      { produits: [], boutiques: [] },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Favoris effacés avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur clearFavoris:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression des favoris'
    });
  }
};

module.exports = {
  getFavoris,
  toggleBoutiqueFavoris,
  toggleProduitFavoris,
  checkBoutiqueFavoris,
  checkProduitFavoris,
  clearFavoris
};