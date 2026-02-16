const Commande = require('../../models/commande.model');

// @desc    Chiffre d'affaires de la boutique
// @route   GET /api/boutique/commandes/chiffre-affaires
const getChiffreAffaires = async (req, res) => {
  try {
    const { debut, fin } = req.query;
    
    let filter = {
      boutique: req.boutique._id,
      statut: 'PAYEE'
    };

    if (debut || fin) {
      filter.createdAt = {};
      if (debut) filter.createdAt.$gte = new Date(debut);
      if (fin) filter.createdAt.$lte = new Date(fin);
    }

    const commandes = await Commande.find(filter);
    
    const caTotal = commandes.reduce((sum, cmd) => sum + cmd.montant_total, 0);
    
    // CA par jour/semaine/mois
    const caParPeriode = {};
    commandes.forEach(cmd => {
      const date = cmd.createdAt.toISOString().split('T')[0];
      caParPeriode[date] = (caParPeriode[date] || 0) + cmd.montant_total;
    });

    res.json({
      boutique_id: req.boutique._id,
      periode: {
        debut: debut || 'Toujours',
        fin: fin || 'Maintenant'
      },
      chiffre_affaires_total: caTotal,
      nombre_commandes: commandes.length,
      panier_moyen: commandes.length > 0 ? caTotal / commandes.length : 0,
      evolution_quotidienne: caParPeriode
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Liste des commandes reçues
// @route   GET /api/boutique/commandes
const getCommandes = async (req, res) => {
  try {
    const { statut, page = 1, limit = 20 } = req.query;
    
    let query = { boutique: req.boutique._id };
    if (statut) query.statut = statut;

    const commandes = await Commande.find(query)
      .populate('utilisateur', 'username email')
      .populate('items.produit', 'nom prix images')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort('-createdAt');

    const total = await Commande.countDocuments(query);

    res.json({
      commandes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Statistiques complètes
// @route   GET /api/boutique/commandes/statistiques
const getStatistiques = async (req, res) => {
  try {
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const debutAnnee = new Date(maintenant.getFullYear(), 0, 1);

    const [
      caMois,
      caAnnee,
      produitsVendus,
      statsStatut
    ] = await Promise.all([
      // CA du mois
      Commande.aggregate([
        {
          $match: {
            boutique: req.boutique._id,
            statut: 'PAYEE',
            createdAt: { $gte: debutMois }
          }
        },
        { $group: { _id: null, total: { $sum: '$montant_total' } } }
      ]),
      
      // CA de l'année
      Commande.aggregate([
        {
          $match: {
            boutique: req.boutique._id,
            statut: 'PAYEE',
            createdAt: { $gte: debutAnnee }
          }
        },
        { $group: { _id: null, total: { $sum: '$montant_total' } } }
      ]),
      
      // Top produits vendus
      Commande.aggregate([
        { $match: { boutique: req.boutique._id, statut: 'PAYEE' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.produit',
            quantite: { $sum: '$items.quantite' },
            montant: { $sum: { $multiply: ['$items.prix_unitaire', '$items.quantite'] } }
          }
        },
        { $sort: { quantite: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'produits',
            localField: '_id',
            foreignField: '_id',
            as: 'produit'
          }
        },
        { $unwind: '$produit' }
      ]),
      
      // Statistiques par statut
      Commande.aggregate([
        { $match: { boutique: req.boutique._id } },
        { $group: { _id: '$statut', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      chiffre_affaires: {
        mois: caMois[0]?.total || 0,
        annee: caAnnee[0]?.total || 0
      },
      top_produits: produitsVendus,
      commandes_par_statut: statsStatut,
      date: maintenant
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCommandes,
  getChiffreAffaires,
  getStatistiques
};