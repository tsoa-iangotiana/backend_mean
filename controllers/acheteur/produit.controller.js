const Produit = require('../../models/produit.model');
const Avis = require('../../models/avis.model');
const Promotion = require('../../models/promotion.model');
const mongoose = require('mongoose');

// @desc    Obtenir les produits d'une boutique avec filtres enrichis
const getProduitsByBoutique = async (req, res) => {
  try {
    const {
      categorie,
      prix_min,
      prix_max,
      en_stock,
      search,
      tri,
      note_min,
      en_promotion,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {
      boutique: req.params.boutiqueId,
      actif: true
    };

    // Filtres de base
    if (categorie) filter.categorie = categorie;
    if (prix_min || prix_max) {
      filter.prix = {};
      if (prix_min) filter.prix.$gte = parseFloat(prix_min);
      if (prix_max) filter.prix.$lte = parseFloat(prix_max);
    }
    if (en_stock === 'true') filter.stock = { $gt: 0 };
    if (note_min) filter.note_moyenne = { $gte: parseFloat(note_min) };
    
    // Recherche textuelle
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Configuration du tri
    let sort = {};
    switch (tri) {
      case 'prix_asc': sort = { prix: 1 }; break;
      case 'prix_desc': sort = { prix: -1 }; break;
      case 'note': sort = { note_moyenne: -1 }; break;
      case 'note_asc': sort = { note_moyenne: 1 }; break;
      case 'stock': sort = { stock: -1 }; break;
      case 'nom_asc': sort = { nom: 1 }; break;
      case 'nom_desc': sort = { nom: -1 }; break;
      case 'nouveaute': sort = { createdAt: -1 }; break;
      default: sort = { note_moyenne: -1, createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Récupération des produits avec leurs informations de base
    let produits = await Produit.find(filter)
      .populate('categorie', 'nom')
      .select('nom prix description images note_moyenne stock createdAt')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Enrichissement des produits avec promotions et avis
    const maintenant = new Date();
    const produitsIds = produits.map(p => p._id);

    // Récupération des promotions actives pour ces produits
    const promotions = await Promotion.find({
      produits: { $in: produitsIds },
      date_debut: { $lte: maintenant },
      date_fin: { $gte: maintenant }
    }).lean();

    // Récupération des statistiques d'avis
    const avisStats = await Avis.aggregate([
      {
        $match: {
          cible_type: 'PRODUIT',
          cible_id: { $in: produitsIds }
        }
      },
      {
        $group: {
          _id: '$cible_id',
          nombre_avis: { $sum: 1 },
          note_moyenne_calculee: { $avg: '$note' },
          repartition_notes: {
            $push: '$note'
          }
        }
      }
    ]);

    // Création d'un map pour les stats d'avis
    const avisMap = {};
    avisStats.forEach(stat => {
      avisMap[stat._id.toString()] = {
        nombre_avis: stat.nombre_avis,
        note_moyenne: Math.round(stat.note_moyenne_calculee * 10) / 10,
        repartition: [1, 2, 3, 4, 5].map(note => ({
          note,
          count: stat.repartition_notes.filter(r => Math.floor(r) === note).length
        }))
      };
    });

    // Création d'un map pour les promotions
    const promotionMap = {};
    promotions.forEach(promo => {
      promo.produits.forEach(produitId => {
        const idStr = produitId.toString();
        if (!promotionMap[idStr]) {
          promotionMap[idStr] = [];
        }
        promotionMap[idStr].push({
          reduction: promo.reduction,
          date_fin: promo.date_fin,
          jours_restants: Math.ceil((new Date(promo.date_fin) - maintenant) / (1000 * 60 * 60 * 24))
        });
      });
    });

    // Enrichissement final des produits
    const produitsEnrichis = produits.map(produit => {
      const produitId = produit._id.toString();
      const avis = avisMap[produitId] || { nombre_avis: 0, note_moyenne: produit.note_moyenne, repartition: [] };
      const promotions = promotionMap[produitId] || [];

      // Calcul du prix avec promotion (si applicable)
      let prix_original = produit.prix;
      let prix_promotionnel = null;
      let meilleure_promotion = null;

      if (promotions.length > 0) {
        meilleure_promotion = promotions.reduce((max, p) => p.reduction > max.reduction ? p : max);
        prix_promotionnel = produit.prix * (1 - meilleure_promotion.reduction / 100);
      }

      // Détermination de la situation du stock
      let situation_stock = 'en_stock';
      if (produit.stock === 0) situation_stock = 'rupture';
      else if (produit.stock <= 5) situation_stock = 'stock_faible';

      return {
        ...produit,
        prix_original,
        prix_promotionnel,
        en_promotion: promotions.length > 0,
        promotion: meilleure_promotion,
        stock: {
          quantite: produit.stock,
          situation: situation_stock,
          limite_achat: produit.stock > 0 ? Math.min(produit.stock, 10) : 0
        },
        note: {
          moyenne: avis.note_moyenne,
          nombre_avis: avis.nombre_avis,
          repartition: avis.repartition
        },
        // Supprimer les champs redondants si nécessaire
        note_moyenne: undefined
      };
    });

    // Filtre supplémentaire pour les produits en promotion
    if (en_promotion === 'true') {
      produitsEnrichis = produitsEnrichis.filter(p => p.en_promotion);
    }

    const total = await Produit.countDocuments(filter);

    res.json({
      produits: produitsEnrichis,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filtres_appliques: {
        categorie: categorie || null,
        prix_min: prix_min || null,
        prix_max: prix_max || null,
        en_stock: en_stock || null,
        note_min: note_min || null,
        en_promotion: en_promotion || null,
        tri: tri || 'defaut'
      }
    });
  } catch (error) {
    console.error('Erreur getProduitsByBoutique:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
  }
};

// @desc    Obtenir le détail complet d'un produit
const getProduitById = async (req, res) => {
  try {
    const produit = await Produit.findOne({
      _id: req.params.id,
      actif: true
    })
      .populate('boutique', 'nom note_moyenne adresse telephone email')
      .populate('categorie', 'nom description')
      .lean();

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    const maintenant = new Date();

    // Récupération des promotions actives pour ce produit
    const promotions = await Promotion.find({
      produits: produit._id,
      date_debut: { $lte: maintenant },
      date_fin: { $gte: maintenant }
    }).lean();

    // Récupération des avis avec les détails des utilisateurs
    const avis = await Avis.find({
      cible_type: 'PRODUIT',
      cible_id: produit._id
    })
      .populate('utilisateur', 'nom email avatar')
      .sort('-createdAt')
      .lean();

    // Statistiques détaillées des avis
    const avisStats = await Avis.aggregate([
      {
        $match: {
          cible_type: 'PRODUIT',
          cible_id: produit._id
        }
      },
      {
        $group: {
          _id: null,
          moyenne: { $avg: '$note' },
          total: { $sum: 1 },
          notes: { $push: '$note' }
        }
      }
    ]);

    const stats = avisStats[0] || { moyenne: 0, total: 0, notes: [] };
    
    // Répartition des notes
    const repartitionNotes = [5, 4, 3, 2, 1].map(note => ({
      note,
      count: stats.notes.filter(n => Math.floor(n) === note).length,
      pourcentage: stats.total > 0 
        ? Math.round((stats.notes.filter(n => Math.floor(n) === note).length / stats.total) * 100)
        : 0
    }));

    // Calcul du prix avec promotion
    let prix_original = produit.prix;
    let prix_promotionnel = null;
    let meilleure_promotion = null;

    if (promotions.length > 0) {
      meilleure_promotion = promotions.reduce((max, p) => p.reduction > max.reduction ? p : max);
      prix_promotionnel = produit.prix * (1 - meilleure_promotion.reduction / 100);
      
      // Ajouter les jours restants
      meilleure_promotion.jours_restants = Math.ceil(
        (new Date(meilleure_promotion.date_fin) - maintenant) / (1000 * 60 * 60 * 24)
      );
    }

    // Situation du stock
    const situation_stock = produit.stock === 0 ? 'rupture' 
      : produit.stock <= 5 ? 'stock_faible' 
      : 'en_stock';

    // Produits similaires (même catégorie, autre boutique ou même boutique)
    const produitsSimilaires = await Produit.find({
      _id: { $ne: produit._id },
      categorie: produit.categorie,
      actif: true,
      stock: { $gt: 0 }
    })
      .limit(4)
      .select('nom prix images note_moyenne stock boutique')
      .populate('boutique', 'nom')
      .lean();

    // Enrichissement des produits similaires avec leur note et promotion
    const produitsSimilairesIds = produitsSimilaires.map(p => p._id);
    const promosSimilaires = await Promotion.find({
      produits: { $in: produitsSimilairesIds },
      date_debut: { $lte: maintenant },
      date_fin: { $gte: maintenant }
    }).lean();

    const produitsSimilairesEnrichis = produitsSimilaires.map(prod => {
      const promoProd = promosSimilaires.find(p => 
        p.produits.some(id => id.toString() === prod._id.toString())
      );
      
      return {
        ...prod,
        en_promotion: !!promoProd,
        reduction: promoProd ? promoProd.reduction : null,
        prix_promotionnel: promoProd ? prod.prix * (1 - promoProd.reduction / 100) : null,
        stock_disponible: prod.stock > 0
      };
    });

    // Construction de la réponse enrichie
    const produitEnrichi = {
      _id: produit._id,
      nom: produit.nom,
      description: produit.description,
      prix: {
        original: prix_original,
        promotionnel: prix_promotionnel,
        en_promotion: promotions.length > 0,
        promotion: meilleure_promotion,
        unite: produit.unite
      },
      stock: {
        quantite: produit.stock,
        situation: situation_stock,
        limite_achat: produit.stock > 0 ? Math.min(produit.stock, 10) : 0,
        disponible: produit.stock > 0
      },
      images: produit.images,
      categorie: produit.categorie,
      boutique: produit.boutique,
      note: {
        moyenne: Math.round(stats.moyenne * 10) / 10 || produit.note_moyenne,
        nombre_avis: stats.total,
        repartition: repartitionNotes
      },
      avis: avis.map(a => ({
        id: a._id,
        utilisateur: a.utilisateur,
        note: a.note,
        commentaire: a.commentaire,
        date: a.createdAt
      })),
      meta: {
        created_at: produit.createdAt,
        updated_at: produit.updatedAt,
        reference: produit._id.toString().slice(-6).toUpperCase()
      }
    };

    res.json({
      produit: produitEnrichi,
      produits_similaires: produitsSimilairesEnrichis,
      conseils_achat: {
        quantite_max: produitEnrichi.stock.limite_achat,
        stock_status: produitEnrichi.stock.situation === 'rupture' 
          ? '❌ Produit temporairement indisponible'
          : produitEnrichi.stock.situation === 'stock_faible'
          ? '⚠️ Plus que quelques unités en stock'
          : '✅ En stock',
        promotion_active: produitEnrichi.prix.en_promotion
          ? `🎉 Promotion -${meilleure_promotion.reduction}% jusqu'au ${new Date(meilleure_promotion.date_fin).toLocaleDateString()}`
          : null
      }
    });
  } catch (error) {
    console.error('Erreur getProduitById:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du produit' });
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
    }).lean();

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    // Vérifier les promotions actives
    const maintenant = new Date();
    const promotion = await Promotion.findOne({
      produits: produit._id,
      date_debut: { $lte: maintenant },
      date_fin: { $gte: maintenant }
    }).lean();

    const quantiteDemandee = parseInt(quantite);
    const disponible = produit.stock >= quantiteDemandee;
    const situation_stock = produit.stock === 0 ? 'rupture' 
      : produit.stock <= 5 ? 'stock_faible' 
      : 'en_stock';

    // Message personnalisé selon la situation
    let message = '';
    if (!disponible) {
      if (produit.stock === 0) {
        message = '❌ Produit actuellement en rupture de stock';
      } else {
        message = `❌ Stock insuffisant (${produit.stock} disponible${produit.stock > 1 ? 's' : ''})`;
      }
    } else {
      message = '✅ Produit disponible';
    }

    // Ajouter une alerte si stock faible
    if (disponible && produit.stock <= 5) {
      message += ' ⚠️ Stock faible, commandez rapidement !';
    }

    // Ajouter info promotion
    if (promotion) {
      message += ` 🎉 Promotion -${promotion.reduction}% active !`;
    }

    res.json({
      produit: {
        id: produit._id,
        nom: produit.nom,
        prix: produit.prix,
        prix_promotionnel: promotion ? produit.prix * (1 - promotion.reduction / 100) : null,
        en_promotion: !!promotion
      },
      disponibilite: {
        disponible,
        stock_actuel: produit.stock,
        situation: situation_stock,
        quantite_demandee: quantiteDemandee,
        quantite_max: Math.min(produit.stock, 10)
      },
      message,
      conseil: !disponible && produit.stock > 0 
        ? `Vous pouvez commander jusqu'à ${produit.stock} unité${produit.stock > 1 ? 's' : ''}`
        : null
    });
  } catch (error) {
    console.error('Erreur checkDisponibilite:', error);
    res.status(500).json({ message: 'Erreur lors de la vérification de disponibilité' });
  }
};

module.exports = {
  getProduitsByBoutique,
  getProduitById,
  checkDisponibilite
};