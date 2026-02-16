const Commande = require('../../models/commande.model');
const Produit = require('../../models/produit.model');
const Panier = require('../../models/panier.model');
const Promotion = require('../../models/promotion.model');
const mongoose = require('mongoose');

// @desc    Payer une commande (mettre à jour le statut et décrémenter le stock)
// @route   PUT /api/commandes/:commandeId/payer
const payerCommande = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { commandeId } = req.params;
    const utilisateurId = req.user._id;
    const { mode_paiement } = req.body; // Optionnel: informations de paiement

    // Récupérer la commande
    const commande = await Commande.findOne({
      _id: commandeId,
      utilisateur: utilisateurId,
      statut: 'EN_ATTENTE'
    }).populate('items.produit');

    if (!commande) {
      return res.status(404).json({ 
        message: 'Commande non trouvée ou déjà traitée' 
      });
    }

    // Vérifier la disponibilité des produits
    for (const item of commande.items) {
      const produit = item.produit;
      
      if (!produit || !produit.actif) {
        throw new Error(`Le produit ${item.produit?.nom || 'inconnu'} n'est plus disponible`);
      }

      if (produit.stock < item.quantite) {
        throw new Error(`Stock insuffisant pour ${produit.nom}. Disponible: ${produit.stock}`);
      }
    }

    // Mettre à jour les stocks
    for (const item of commande.items) {
      await Produit.findByIdAndUpdate(
        item.produit._id,
        { $inc: { stock: -item.quantite } },
        { session }
      );
    }

    // Mettre à jour le statut de la commande
    commande.statut = 'PAYEE';
    commande.paiement = {
      mode: mode_paiement || 'CARTE',
      date: new Date(),
      montant: commande.montant_total
    };
    
    await commande.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Récupérer la commande mise à jour avec les détails
    const commandeComplete = await Commande.findById(commande._id)
      .populate('boutique', 'nom')
      .populate('items.produit', 'nom');

    res.json({
      message: 'Paiement effectué avec succès',
      commande: {
        id: commandeComplete._id,
        boutique: commandeComplete.boutique.nom,
        montant_total: commandeComplete.montant_total,
        statut: commandeComplete.statut,
        date_paiement: commandeComplete.paiement.date,
        items: commandeComplete.items.map(item => ({
          produit: item.produit.nom,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          total: item.prix_unitaire * item.quantite
        }))
      },
      reçu: {
        numéro: `CMD-${commande._id.toString().slice(-8).toUpperCase()}`,
        date: new Date().toLocaleDateString('fr-FR'),
        montant: commande.montant_total.toFixed(2) + ' €'
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Erreur payerCommande:', error);
    res.status(500).json({ 
      message: error.message || 'Erreur lors du paiement de la commande' 
    });
  }
};

// @desc    Lister les commandes de l'utilisateur avec filtres
// @route   GET /api/commandes
const listerCommandes = async (req, res) => {
  try {
    const utilisateurId = req.user._id;
    const {
      statut,
      boutique,
      date_debut,
      date_fin,
      prix_min,
      prix_max,
      tri = 'date_desc',
      page = 1,
      limit = 10
    } = req.query;

    // Construction du filtre
    const filter = { utilisateur: utilisateurId };

    if (statut) {
      const statuts = statut.split(',');
      if (statuts.length > 0) {
        filter.statut = { $in: statuts };
      }
    }

    if (boutique) {
      filter.boutique = boutique;
    }

    // Filtre par date
    if (date_debut || date_fin) {
      filter.createdAt = {};
      if (date_debut) filter.createdAt.$gte = new Date(date_debut);
      if (date_fin) {
        const fin = new Date(date_fin);
        fin.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = fin;
      }
    }

    // Filtre par montant
    if (prix_min || prix_max) {
      filter.montant_total = {};
      if (prix_min) filter.montant_total.$gte = parseFloat(prix_min);
      if (prix_max) filter.montant_total.$lte = parseFloat(prix_max);
    }

    // Configuration du tri
    let sort = {};
    switch (tri) {
      case 'date_asc':
        sort = { createdAt: 1 };
        break;
      case 'date_desc':
        sort = { createdAt: -1 };
        break;
      case 'montant_asc':
        sort = { montant_total: 1 };
        break;
      case 'montant_desc':
        sort = { montant_total: -1 };
        break;
      case 'statut':
        sort = { statut: 1, createdAt: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les commandes
    const commandes = await Commande.find(filter)
      .populate('boutique', 'nom')
      .populate('items.produit', 'nom images')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Enrichir les commandes avec des informations supplémentaires
    const commandesEnrichies = commandes.map(commande => ({
      _id: commande._id,
      boutique: commande.boutique.nom,
      date: commande.createdAt,
      montant_total: commande.montant_total,
      statut: commande.statut,
      statut_info: getStatutInfo(commande.statut),
      nombre_articles: commande.items.reduce((sum, item) => sum + item.quantite, 0),
      apercu_produits: commande.items.slice(0, 3).map(item => ({
        nom: item.produit.nom,
        image: item.produit.images?.[0] || null,
        quantite: item.quantite
      })),
      peut_annuler: commande.statut === 'EN_ATTENTE',
      peut_payer: commande.statut === 'EN_ATTENTE'
    }));

    const total = await Commande.countDocuments(filter);

    // Statistiques globales
    const stats = await Commande.aggregate([
      {
        $match: { utilisateur: new mongoose.Types.ObjectId(utilisateurId) }
      },
      {
        $group: {
          _id: null,
          total_commandes: { $sum: 1 },
          total_depense: { $sum: '$montant_total' },
          moyenne_panier: { $avg: '$montant_total' },
          commandes_par_statut: {
            $push: '$statut'
          }
        }
      }
    ]);

    const statistiques = stats[0] ? {
      total_commandes: stats[0].total_commandes,
      total_depense: Math.round(stats[0].total_depense * 100) / 100,
      moyenne_panier: Math.round(stats[0].moyenne_panier * 100) / 100,
      repartition_statuts: {
        EN_ATTENTE: stats[0].commandes_par_statut.filter(s => s === 'EN_ATTENTE').length,
        PAYEE: stats[0].commandes_par_statut.filter(s => s === 'PAYEE').length,
        LIVREE: stats[0].commandes_par_statut.filter(s => s === 'LIVREE').length,
        ANNULEE: stats[0].commandes_par_statut.filter(s => s === 'ANNULEE').length
      }
    } : {
      total_commandes: 0,
      total_depense: 0,
      moyenne_panier: 0,
      repartition_statuts: {}
    };

    res.json({
      commandes: commandesEnrichies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      statistiques,
      filtres_appliques: {
        statut: statut || 'tous',
        date_debut: date_debut || null,
        date_fin: date_fin || null,
        tri
      }
    });

  } catch (error) {
    console.error('Erreur listerCommandes:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des commandes' });
  }
};

// @desc    Obtenir les détails d'une commande spécifique
// @route   GET /api/commandes/:commandeId
const getCommandeDetails = async (req, res) => {
  try {
    const { commandeId } = req.params;
    const utilisateurId = req.user._id;

    const commande = await Commande.findOne({
      _id: commandeId,
      utilisateur: utilisateurId
    })
      .populate('boutique', 'nom email telephone adresse')
      .populate('items.produit', 'nom images description prix')
      .populate('utilisateur', 'nom email')
      .lean();

    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Calculer des informations supplémentaires
    const total_original = commande.items.reduce(
      (sum, item) => sum + (item.produit.prix * item.quantite), 
      0
    );

    const economies = total_original - commande.montant_total;

    // Organiser les items avec détails
    const itemsDetails = commande.items.map(item => ({
      produit: {
        id: item.produit._id,
        nom: item.produit.nom,
        image: item.produit.images?.[0] || null,
        prix_actuel: item.produit.prix
      },
      quantite: item.quantite,
      prix_unitaire: item.prix_unitaire,
      total: item.prix_unitaire * item.quantite,
      prix_original: item.produit.prix,
      economies: (item.produit.prix - item.prix_unitaire) * item.quantite
    }));

    const reponse = {
      commande: {
        id: commande._id,
        reference: `CMD-${commande._id.toString().slice(-8).toUpperCase()}`,
        date: commande.createdAt,
        statut: commande.statut,
        statut_info: getStatutInfo(commande.statut),
        montant_total: commande.montant_total,
        total_original,
        economies: economies > 0 ? economies : 0,
        boutique: commande.boutique,
        utilisateur: commande.utilisateur
      },
      items: itemsDetails,
      paiement: commande.paiement || {
        mode: null,
        date: null,
        statut: commande.statut === 'PAYEE' ? 'Effectué' : 'En attente'
      },
      chronologie: {
        creation: commande.createdAt,
        paiement: commande.paiement?.date || null,
        livraison: commande.statut === 'LIVREE' ? commande.updatedAt : null,
        annulation: commande.statut === 'ANNULEE' ? commande.updatedAt : null
      },
      actions_disponibles: {
        peut_payer: commande.statut === 'EN_ATTENTE',
        peut_annuler: commande.statut === 'EN_ATTENTE',
        peut_contacter: true
      }
    };

    res.json(reponse);

  } catch (error) {
    console.error('Erreur getCommandeDetails:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la commande' });
  }
};

// @desc    Annuler une commande
// @route   PUT /api/commandes/:commandeId/annuler
const annulerCommande = async (req, res) => {
  try {
    const { commandeId } = req.params;
    const utilisateurId = req.user._id;
    const { raison } = req.body;

    const commande = await Commande.findOne({
      _id: commandeId,
      utilisateur: utilisateurId,
      statut: { $in: ['EN_ATTENTE', 'PAYEE'] }
    });

    if (!commande) {
      return res.status(404).json({ 
        message: 'Commande non trouvée ou ne peut pas être annulée' 
      });
    }

    // Si la commande était payée, il faudrait gérer le remboursement ici
    const ancienStatut = commande.statut;
    commande.statut = 'ANNULEE';
    commande.annulation = {
      raison: raison || 'Annulation par l\'utilisateur',
      date: new Date(),
      ancien_statut: ancienStatut
    };

    await commande.save();

    res.json({
      message: 'Commande annulée avec succès',
      commande: {
        id: commande._id,
        statut: commande.statut,
        date_annulation: commande.annulation.date
      }
    });

  } catch (error) {
    console.error('Erreur annulerCommande:', error);
    res.status(500).json({ message: 'Erreur lors de l\'annulation de la commande' });
  }
};

// Fonction utilitaire pour obtenir les informations sur le statut
function getStatutInfo(statut) {
  const infos = {
    'EN_ATTENTE': {
      libelle: 'En attente de paiement',
      couleur: 'orange',
      icon: '⏳',
      description: 'Commande enregistrée en attente de confirmation de paiement'
    },
    'PAYEE': {
      libelle: 'Payée',
      couleur: 'blue',
      icon: '✓',
      description: 'Paiement confirmé, commande en cours de préparation'
    },
    'LIVREE': {
      libelle: 'Livrée',
      couleur: 'green',
      icon: '✅',
      description: 'Commande livrée avec succès'
    },
    'ANNULEE': {
      libelle: 'Annulée',
      couleur: 'red',
      icon: '✗',
      description: 'Commande annulée'
    }
  };

  return infos[statut] || {
    libelle: statut,
    couleur: 'gray',
    icon: '•',
    description: 'Statut inconnu'
  };
}

module.exports = {
  payerCommande,
  listerCommandes,
  getCommandeDetails,
  annulerCommande
};