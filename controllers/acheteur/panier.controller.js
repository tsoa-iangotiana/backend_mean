const Panier = require('../../models/panier.model');
const Produit = require('../../models/produit.model');
const Commande = require('../../models/commande.model');
const Promotion = require('../../models/promotion.model');
const mongoose = require('mongoose');

// @desc    Ajouter un produit au panier
// @route   POST /api/panier/ajouter
const ajouterProduit = async (req, res) => {
  try {
    const { produitId, quantite = 1 } = req.body;
    const utilisateurId = req.user._id; // À adapter selon votre système d'auth

    // Validation des données
    if (!produitId) {
      return res.status(400).json({ message: 'ID du produit requis' });
    }

    if (quantite < 1) {
      return res.status(400).json({ message: 'La quantité doit être au moins 1' });
    }

    // Vérifier que le produit existe et est actif
    const produit = await Produit.findOne({ 
      _id: produitId, 
      actif: true 
    });

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé ou indisponible' });
    }

    // Vérifier le stock
    if (produit.stock < quantite) {
      return res.status(400).json({ 
        message: `Stock insuffisant. Disponible: ${produit.stock}`,
        stock_disponible: produit.stock
      });
    }

    // Chercher un panier existant pour l'utilisateur
    let panier = await Panier.findOne({ utilisateur: utilisateurId });

    if (!panier) {
      // Créer un nouveau panier
      panier = new Panier({
        utilisateur: utilisateurId,
        items: [],
        total: 0
      });
    }

    // Vérifier si le produit est déjà dans le panier
    const itemIndex = panier.items.findIndex(
      item => item.produit.toString() === produitId
    );

    if (itemIndex > -1) {
      // Produit déjà dans le panier, mettre à jour la quantité
      const nouvelleQuantite = panier.items[itemIndex].quantite + quantite;
      
      // Vérifier le stock pour la nouvelle quantité totale
      if (produit.stock < nouvelleQuantite) {
        return res.status(400).json({ 
          message: `Stock insuffisant pour la quantité totale. Maximum: ${produit.stock}`,
          stock_disponible: produit.stock,
          quantite_actuelle: panier.items[itemIndex].quantite
        });
      }

      panier.items[itemIndex].quantite = nouvelleQuantite;
    } else {
      // Nouveau produit dans le panier
      panier.items.push({
        produit: produitId,
        quantite
      });
    }

    // Recalculer le total du panier
    await calculerTotalPanier(panier);

    await panier.save();

    // Récupérer le panier avec les détails des produits pour la réponse
    const panierComplet = await getPanierComplet(panier._id);

    res.status(201).json({
      message: 'Produit ajouté au panier avec succès',
      panier: panierComplet
    });

  } catch (error) {
    console.error('Erreur ajouterProduit:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout au panier' });
  }
};

// @desc    Supprimer un produit du panier
// @route   DELETE /api/panier/supprimer/:produitId
const supprimerProduit = async (req, res) => {
  try {
    const { produitId } = req.params;
    const utilisateurId = req.user._id;

    const panier = await Panier.findOne({ utilisateur: utilisateurId });

    if (!panier) {
      return res.status(404).json({ message: 'Panier non trouvé' });
    }

    // Filtrer pour supprimer le produit
    panier.items = panier.items.filter(
      item => item.produit.toString() !== produitId
    );

    // Recalculer le total
    await calculerTotalPanier(panier);
    await panier.save();

    const panierComplet = await getPanierComplet(panier._id);

    res.json({
      message: 'Produit supprimé du panier',
      panier: panierComplet
    });

  } catch (error) {
    console.error('Erreur supprimerProduit:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du produit' });
  }
};

// @desc    Modifier la quantité d'un produit dans le panier
// @route   PUT /api/panier/modifier-quantite
const modifierQuantite = async (req, res) => {
  try {
    const { produitId, quantite } = req.body;
    const utilisateurId = req.user._id;

    if (!produitId || quantite === undefined) {
      return res.status(400).json({ message: 'Produit ID et quantité requis' });
    }

    if (quantite < 1) {
      return res.status(400).json({ message: 'La quantité doit être au moins 1' });
    }

    // Vérifier le stock disponible
    const produit = await Produit.findById(produitId);
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    if (produit.stock < quantite) {
      return res.status(400).json({ 
        message: `Stock insuffisant. Maximum: ${produit.stock}`,
        stock_disponible: produit.stock
      });
    }

    const panier = await Panier.findOne({ utilisateur: utilisateurId });

    if (!panier) {
      return res.status(404).json({ message: 'Panier non trouvé' });
    }

    // Trouver l'item et mettre à jour la quantité
    const itemIndex = panier.items.findIndex(
      item => item.produit.toString() === produitId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Produit non trouvé dans le panier' });
    }

    panier.items[itemIndex].quantite = quantite;

    // Recalculer le total
    await calculerTotalPanier(panier);
    await panier.save();

    const panierComplet = await getPanierComplet(panier._id);

    res.json({
      message: 'Quantité modifiée avec succès',
      panier: panierComplet
    });

  } catch (error) {
    console.error('Erreur modifierQuantite:', error);
    res.status(500).json({ message: 'Erreur lors de la modification de la quantité' });
  }
};

// @desc    Obtenir le total du panier
// @route   GET /api/panier/total
const getTotalPanier = async (req, res) => {
  try {
    const utilisateurId = req.user._id;

    const panier = await Panier.findOne({ utilisateur: utilisateurId });

    if (!panier) {
      return res.json({
        total: 0,
        nombre_articles: 0,
        items: []
      });
    }

    // Recalculer le total pour être sûr
    await calculerTotalPanier(panier);

    const panierComplet = await getPanierComplet(panier._id);

    res.json({
      total: panierComplet.total,
      total_original: panierComplet.total_original,
      total_economies: panierComplet.total_economies,
      nombre_articles: panierComplet.nombre_articles,
      items: panierComplet.items.map(item => ({
        produit: item.produit.nom,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        prix_total: item.prix_total,
        en_promotion: item.en_promotion
      }))
    });

  } catch (error) {
    console.error('Erreur getTotalPanier:', error);
    res.status(500).json({ message: 'Erreur lors du calcul du total' });
  }
};

// @desc    Valider le panier et créer une commande
// @route   POST /api/panier/valider
const validerPanier = async (req, res) => {
  try {
    const utilisateurId = req.user._id;
    const { notes } = req.body;

    // Récupérer le panier avec les détails complets (boutique incluse)
    const panier = await Panier.findOne({ utilisateur: utilisateurId })
      .populate({
        path: 'items.produit',
        populate: {
          path: 'boutique',
          select: 'nom'
        }
      });

    if (!panier || panier.items.length === 0) {
      return res.status(400).json({ message: 'Panier vide' });
    }

    // Vérifier la disponibilité des produits et regrouper par boutique
    const commandesParBoutique = new Map();
    
    // Pour les logs détaillés
    const detailsProduits = [];

    for (const item of panier.items) {
      const produit = item.produit;
      
      // Vérifier que le produit existe toujours
      if (!produit || !produit.actif) {
        return res.status(400).json({ 
          message: `Le produit ${item.produit?.nom || 'inconnu'} n'est plus disponible` 
        });
      }

      // Vérifier le stock
      if (produit.stock < item.quantite) {
        return res.status(400).json({ 
          message: `Stock insuffisant pour ${produit.nom}. Disponible: ${produit.stock}`,
          produit: {
            id: produit._id,
            nom: produit.nom,
            stock_disponible: produit.stock,
            stock_demande: item.quantite
          }
        });
      }

      // Récupérer les promotions actives pour ce produit
      const promotion = await Promotion.findOne({
        produits: produit._id,
        date_debut: { $lte: new Date() },
        date_fin: { $gte: new Date() }
      });

      const prix_original = produit.prix;
      const reduction = promotion ? promotion.reduction : 0;
      const prix_unitaire = promotion 
        ? Math.round(produit.prix * (1 - promotion.reduction / 100) * 100) / 100
        : produit.prix;

      const boutiqueId = produit.boutique._id.toString();
      
      if (!commandesParBoutique.has(boutiqueId)) {
        commandesParBoutique.set(boutiqueId, {
          boutique: {
            _id: produit.boutique._id,
            nom: produit.boutique.nom
          },
          items: [],
          montant_total: 0,
          sous_total_original: 0,
          total_economies: 0
        });
      }

      const group = commandesParBoutique.get(boutiqueId);
      const itemTotal = prix_unitaire * item.quantite;
      const itemOriginalTotal = prix_original * item.quantite;
      
      // Ajouter l'item avec tous ses détails
      group.items.push({
        produit: {
          _id: produit._id,
          nom: produit.nom,
          description: produit.description ? 
            (produit.description.length > 100 ? 
              produit.description.substring(0, 100) + '...' : 
              produit.description) : null,
          prix: produit.prix,
          image: produit.images && produit.images.length > 0 ? produit.images[0] : null,
          unite: produit.unite,
          categorie: produit.categorie,
          note_moyenne: produit.note_moyenne
        },
        quantite: item.quantite,
        prix_unitaire: prix_unitaire,
        prix_original: prix_original,
        reduction: reduction,
        total: itemTotal,
        economies: itemOriginalTotal - itemTotal,
        en_promotion: !!promotion
      });

      group.montant_total += itemTotal;
      group.sous_total_original += itemOriginalTotal;
      group.total_economies += (itemOriginalTotal - itemTotal);

      // Ajouter aux détails pour le log
      detailsProduits.push({
        boutique: produit.boutique.nom,
        produit: produit.nom,
        quantite: item.quantite,
        prix_unitaire: prix_unitaire,
        prix_original: prix_original,
        reduction: reduction,
        total: itemTotal,
        economies: itemOriginalTotal - itemTotal
      });
    }

    // Créer une commande par boutique
    const commandesCrees = [];

    for (const [boutiqueId, commandeData] of commandesParBoutique) {
      const nouvelleCommande = new Commande({
        utilisateur: utilisateurId,
        boutique: boutiqueId,
        items: commandeData.items.map(item => ({
          produit: item.produit._id,
          prix_unitaire: item.prix_unitaire,
          quantite: item.quantite
        })),
        montant_total: Math.round(commandeData.montant_total * 100) / 100,
        statut: 'EN_ATTENTE'
      });

      await nouvelleCommande.save();
      commandesCrees.push(nouvelleCommande);
    }

    // Vider le panier
    panier.items = [];
    panier.total = 0;
    await panier.save();

    // Calculer les totaux globaux
    const totalGlobal = commandesCrees.reduce((sum, cmd) => sum + cmd.montant_total, 0);
    const sousTotalGlobal = Array.from(commandesParBoutique.values())
      .reduce((sum, group) => sum + group.sous_total_original, 0);
    const economiesGlobales = Array.from(commandesParBoutique.values())
      .reduce((sum, group) => sum + group.total_economies, 0);

    // Réponse enrichie avec tous les détails
    res.status(201).json({
      message: `✅ ${commandesCrees.length} commande${commandesCrees.length > 1 ? 's' : ''} créée${commandesCrees.length > 1 ? 's' : ''} avec succès`,
      
      // Résumé global
      resume: {
        nombre_commandes: commandesCrees.length,
        nombre_articles: panier.items.reduce((sum, item) => sum + item.quantite, 0),
        nombre_produits_uniques: panier.items.length,
        sous_total: Math.round(sousTotalGlobal * 100) / 100,
        total_economies: Math.round(economiesGlobales * 100) / 100,
        total_global: totalGlobal,
        date_validation: new Date().toISOString()
      },

      // Détail des commandes par boutique
      commandes: commandesCrees.map((cmd, index) => {
        const groupData = Array.from(commandesParBoutique.values())[index];
        return {
          id: cmd._id,
          boutique: groupData.boutique,
          montant_total: cmd.montant_total,
          statut: cmd.statut,
          date_creation: cmd.createdAt,
          
          // Détails de la commande
          details: {
            sous_total: groupData.sous_total_original,
            economies: groupData.total_economies,
            nombre_articles: groupData.items.reduce((sum, item) => sum + item.quantite, 0),
            produits: groupData.items.map(item => ({
              id: item.produit._id,
              nom: item.produit.nom,
              image: item.produit.image,
              quantite: item.quantite,
              prix_unitaire: item.prix_unitaire,
              prix_original: item.prix_original,
              reduction: item.reduction,
              total: item.total,
              economies: item.economies,
              en_promotion: item.en_promotion,
              unite: item.produit.unite
            }))
          }
        };
      }),

      // Liste plate de tous les produits (pratique pour affichage)
      produits: detailsProduits,

      // Notes optionnelles
      notes: notes || null,

      // Pour debug
      _debug: {
        nombre_boutiques: commandesParBoutique.size,
        timestamp: new Date().toLocaleString('fr-FR')
      }
    });

  } catch (error) {
    console.error('❌ Erreur validerPanier:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la validation du panier',
      error: error.message 
    });
  }
};

// @desc    Obtenir le contenu complet du panier
// @route   GET /api/panier
const getPanier = async (req, res) => {
  try {
    const utilisateurId = req.user._id;

    const panier = await Panier.findOne({ utilisateur: utilisateurId });

    if (!panier) {
      return res.json({
        items: [],
        total: 0,
        nombre_articles: 0,
        message: 'Panier vide'
      });
    }

    const panierComplet = await getPanierComplet(panier._id);

    res.json(panierComplet);

  } catch (error) {
    console.error('Erreur getPanier:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du panier' });
  }
};

// @desc    Vider le panier
// @route   DELETE /api/panier/vider
const viderPanier = async (req, res) => {
  try {
    const utilisateurId = req.user._id;

    const panier = await Panier.findOne({ utilisateur: utilisateurId });

    if (panier) {
      panier.items = [];
      panier.total = 0;
      await panier.save();
    }

    res.json({
      message: 'Panier vidé avec succès',
      panier: { items: [], total: 0 }
    });

  } catch (error) {
    console.error('Erreur viderPanier:', error);
    res.status(500).json({ message: 'Erreur lors du vidage du panier' });
  }
};

// Fonctions utilitaires

async function calculerTotalPanier(panier) {
  let total = 0;
  
  for (const item of panier.items) {
    const produit = await Produit.findById(item.produit);
    if (produit) {
      // Vérifier les promotions
      const promotion = await Promotion.findOne({
        produits: produit._id,
        date_debut: { $lte: new Date() },
        date_fin: { $gte: new Date() }
      });

      const prix = promotion 
        ? produit.prix * (1 - promotion.reduction / 100)
        : produit.prix;
      
      total += prix * item.quantite;
    }
  }
  
  panier.total = Math.round(total * 100) / 100;
  return panier.total;
}

async function getPanierComplet(panierId) {
  const panier = await Panier.findById(panierId)
    .populate({
      path: 'items.produit',
      populate: {
        path: 'boutique',
        select: 'nom'
      }
    });

  if (!panier) return null;

  const maintenant = new Date();
  let totalOriginal = 0;
  let totalEconomies = 0;

  const itemsEnrichis = await Promise.all(panier.items.map(async (item) => {
    const produit = item.produit;
    
    // Récupérer la promotion active
    const promotion = await Promotion.findOne({
      produits: produit._id,
      date_debut: { $lte: maintenant },
      date_fin: { $gte: maintenant }
    });

    const prixOriginal = produit.prix;
    const prixPromo = promotion 
      ? produit.prix * (1 - promotion.reduction / 100)
      : produit.prix;
    
    const prixTotalItem = prixPromo * item.quantite;
    const prixTotalOriginal = prixOriginal * item.quantite;

    totalOriginal += prixTotalOriginal;
    totalEconomies += prixTotalOriginal - prixTotalItem;

    return {
      produit: {
        _id: produit._id,
        nom: produit.nom,
        prix: produit.prix,
        image: produit.images?.[0] || null,
        boutique: produit.boutique
      },
      quantite: item.quantite,
      prix_unitaire: Math.round(prixPromo * 100) / 100,
      prix_original: prixOriginal,
      prix_total: Math.round(prixTotalItem * 100) / 100,
      en_promotion: !!promotion,
      reduction: promotion?.reduction || 0,
      stock_disponible: produit.stock
    };
  }));

  return {
    _id: panier._id,
    items: itemsEnrichis,
    total: panier.total,
    total_original: Math.round(totalOriginal * 100) / 100,
    total_economies: Math.round(totalEconomies * 100) / 100,
    nombre_articles: itemsEnrichis.reduce((sum, item) => sum + item.quantite, 0),
    nombre_produits_uniques: itemsEnrichis.length
  };
}

module.exports = {
  ajouterProduit,
  supprimerProduit,
  modifierQuantite,
  getTotalPanier,
  validerPanier,
  getPanier,
  viderPanier
};