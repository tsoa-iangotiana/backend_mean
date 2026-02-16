const Paiement = require('../models/paiement.model');
const Boutique = require('../models/boutique.model');
const mongoose = require('mongoose');


// @desc    Obtenir tous les paiements avec alertes
// @route   GET /api/paiements
// @access  Private (Admin)
const getAllPaiements = async (req, res) => {
  try {
    const {
      boutiqueId,
      statut,
      periode,
      date_debut,
      date_fin,
      page = 1,
      limit = 20,
      tri = 'date_fin_asc'
    } = req.query;

    // Construction du filtre
    const filter = {};
    
    if (boutiqueId) {
      filter.boutique = boutiqueId;
    }

    if (periode) {
      filter.periode = periode;
    }

    if (date_debut || date_fin) {
      filter.date_paiement = {};
      if (date_debut) filter.date_paiement.$gte = new Date(date_debut);
      if (date_fin) {
        const fin = new Date(date_fin);
        fin.setHours(23, 59, 59, 999);
        filter.date_paiement.$lte = fin;
      }
    }

    // Configuration du tri
    let sort = {};
    switch (tri) {
      case 'date_fin_asc':
        sort = { date_fin: 1 };
        break;
      case 'date_fin_desc':
        sort = { date_fin: -1 };
        break;
      case 'date_paiement_asc':
        sort = { date_paiement: 1 };
        break;
      case 'date_paiement_desc':
        sort = { date_paiement: -1 };
        break;
      case 'montant_asc':
        sort = { montant: 1 };
        break;
      case 'montant_desc':
        sort = { montant: -1 };
        break;
      default:
        sort = { date_fin: 1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer tous les paiements
    let paiements = await Paiement.find(filter)
      .populate('boutique', 'nom box active')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Ajouter les alertes à chaque paiement
    paiements = paiements.map(paiement => ajouterAlertePaiement(paiement));

    // Filtrer par statut si demandé (après avoir ajouté les alertes)
    if (statut) {
      paiements = paiements.filter(p => p.alerte.statut === statut);
    }

    const total = await Paiement.countDocuments(filter);

    // Statistiques globales
    const stats = await getStatsPaiements();

    res.json({
      success: true,
      paiements,
      statistiques: stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filtres_appliques: {
        boutique: boutiqueId || null,
        statut: statut || 'tous',
        periode: periode || 'toutes',
        date_debut: date_debut || null,
        date_fin: date_fin || null,
        tri
      }
    });

  } catch (error) {
    console.error('❌ Erreur getAllPaiements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements'
    });
  }
};

// @desc    Obtenir les paiements d'une boutique avec alertes
// @route   GET /api/paiements/boutique/:boutiqueId
// @access  Private (Admin ou responsable boutique)
const getPaiementsByBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Vérifier que la boutique existe
    const boutique = await Boutique.findById(boutiqueId);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let paiements = await Paiement.find({ boutique: boutiqueId })
      .sort('-date_fin')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Ajouter les alertes
    paiements = paiements.map(paiement => ajouterAlertePaiement(paiement));

    const total = await Paiement.countDocuments({ boutique: boutiqueId });

    // Trouver le dernier paiement pour le statut actuel
    const dernierPaiement = paiements.length > 0 ? paiements[0] : null;

    res.json({
      success: true,
      boutique: {
        id: boutique._id,
        nom: boutique.nom
      },
      paiements,
      situation_actuelle: dernierPaiement ? {
        statut: dernierPaiement.alerte.statut,
        message: dernierPaiement.alerte.message,
        couleur: dernierPaiement.alerte.couleur,
        date_fin: dernierPaiement.date_fin,
        jours_restants: dernierPaiement.alerte.jours_restants
      } : {
        statut: 'AUCUN_PAIEMENT',
        message: 'Aucun paiement enregistré',
        couleur: 'gray'
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Erreur getPaiementsByBoutique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements'
    });
  }
};

// @desc    Obtenir un paiement spécifique avec alerte
// @route   GET /api/paiements/:paiementId
// @access  Private (Admin)
const getPaiementById = async (req, res) => {
  try {
    const { paiementId } = req.params;

    const paiement = await Paiement.findById(paiementId)
      .populate('boutique', 'nom box active')
      .lean();

    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Ajouter l'alerte
    const paiementAvecAlerte = ajouterAlertePaiement(paiement);

    // Récupérer l'historique des paiements de cette boutique
    const historique = await Paiement.find({ 
      boutique: paiement.boutique._id,
      _id: { $ne: paiementId }
    })
      .sort('-date_paiement')
      .limit(5)
      .lean();

    const historiqueAvecAlertes = historique.map(h => ajouterAlertePaiement(h));

    res.json({
      success: true,
      paiement: paiementAvecAlerte,
      historique: historiqueAvecAlertes
    });

  } catch (error) {
    console.error('❌ Erreur getPaiementById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du paiement'
    });
  }
};

// @desc    Mettre à jour un paiement
// @route   PUT /api/paiements/:paiementId
// @access  Private (Admin)
const updatePaiement = async (req, res) => {
  try {
    const { paiementId } = req.params;
    const { montant, date_paiement, periode } = req.body;

    const paiement = await Paiement.findById(paiementId);
    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Mise à jour des champs
    if (montant) paiement.montant = montant;
    if (date_paiement) paiement.date_paiement = new Date(date_paiement);
    if (periode) paiement.periode = periode;

    // Recalculer la date de fin si nécessaire
    if (date_paiement || periode) {
      const dateDebut = paiement.date_paiement;
      let dateFin = new Date(dateDebut);

      switch (paiement.periode) {
        case 'mensuel':
          dateFin.setMonth(dateFin.getMonth() + 1);
          break;
        case 'trimestriel':
          dateFin.setMonth(dateFin.getMonth() + 3);
          break;
        case 'annuel':
          dateFin.setFullYear(dateFin.getFullYear() + 1);
          break;
      }
      paiement.date_fin = dateFin;
    }

    await paiement.save();

    const paiementAvecAlerte = ajouterAlertePaiement(paiement.toObject());

    res.json({
      success: true,
      message: 'Paiement mis à jour avec succès',
      paiement: paiementAvecAlerte
    });

  } catch (error) {
    console.error('❌ Erreur updatePaiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du paiement'
    });
  }
};

// @desc    Supprimer un paiement
// @route   DELETE /api/paiements/:paiementId
// @access  Private (Admin)
const deletePaiement = async (req, res) => {
  try {
    const { paiementId } = req.params;

    const paiement = await Paiement.findByIdAndDelete(paiementId);

    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Paiement supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur deletePaiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du paiement'
    });
  }
};

// @desc    Obtenir le tableau de bord des paiements avec alertes
// @route   GET /api/paiements/dashboard
// @access  Private (Admin)
const getDashboardPaiements = async (req, res) => {
  try {
    const maintenant = new Date();

    // Récupérer tous les paiements
    const paiements = await Paiement.find()
      .populate('boutique', 'nom box active')
      .lean();

    // Ajouter les alertes et catégoriser
    const paiementsAvecAlertes = paiements.map(p => ajouterAlertePaiement(p));

    // Regrouper par statut
    const enRegle = paiementsAvecAlertes.filter(p => p.alerte.statut === 'EN_REGLE');
    const bientotExpire = paiementsAvecAlertes.filter(p => p.alerte.statut === 'BIENTOT_EXPIRE');
    const expire = paiementsAvecAlertes.filter(p => p.alerte.statut === 'EXPIRE');

    // Alertes critiques (expirés ou bientôt expirés)
    const alertesCritiques = [
      ...expire.map(p => ({
        type: 'CRITIQUE',
        message: `⚠️ Paiement expiré pour ${p.boutique.nom} depuis ${p.alerte.jours_ecoules} jours`,
        boutique: p.boutique.nom,
        date_fin: p.date_fin,
        montant: p.montant
      })),
      ...bientotExpire.map(p => ({
        type: 'ATTENTION',
        message: `⏰ Paiement de ${p.boutique.nom} expire dans ${p.alerte.jours_restants} jours`,
        boutique: p.boutique.nom,
        date_fin: p.date_fin,
        montant: p.montant
      }))
    ].sort((a, b) => {
      if (a.type === 'CRITIQUE' && b.type !== 'CRITIQUE') return -1;
      if (a.type !== 'CRITIQUE' && b.type === 'CRITIQUE') return 1;
      return 0;
    });

    // Statistiques par boutique
    const statsParBoutique = await Paiement.aggregate([
      {
        $group: {
          _id: '$boutique',
          dernier_paiement: { $max: '$date_paiement' },
          prochaine_echeance: { $min: '$date_fin' },
          total_paye: { $sum: '$montant' },
          nombre_paiements: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'boutiques',
          localField: '_id',
          foreignField: '_id',
          as: 'boutique'
        }
      },
      {
        $unwind: '$boutique'
      },
      {
        $project: {
          'boutique.nom': 1,
          'boutique.box': 1,
          dernier_paiement: 1,
          prochaine_echeance: 1,
          total_paye: 1,
          nombre_paiements: 1
        }
      }
    ]);

    res.json({
      success: true,
      resume: {
        total_paiements: paiements.length,
        en_regle: enRegle.length,
        bientot_expire: bientotExpire.length,
        expire: expire.length,
        montant_total: paiements.reduce((sum, p) => sum + p.montant, 0)
      },
      alertes: alertesCritiques,
      details: {
        en_regle: enRegle.slice(0, 10),
        bientot_expire: bientotExpire.slice(0, 10),
        expire: expire.slice(0, 10)
      },
      statistiques_par_boutique: statsParBoutique
    });

  } catch (error) {
    console.error('❌ Erreur getDashboardPaiements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du dashboard'
    });
  }
};

// @desc    Vérifier la situation de paiement d'une boutique
// @route   GET /api/paiements/verifier/:boutiqueId
// @access  Private (Admin ou responsable)
const verifierSituationBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;

    // Récupérer la boutique
    const boutique = await Boutique.findById(boutiqueId);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    // Récupérer le dernier paiement
    const dernierPaiement = await Paiement.findOne({ boutique: boutiqueId })
      .sort('-date_fin')
      .lean();

    if (!dernierPaiement) {
      return res.json({
        success: true,
        boutique: {
          id: boutique._id,
          nom: boutique.nom
        },
        situation: {
          statut: 'AUCUN_PAIEMENT',
          message: 'Aucun paiement enregistré pour cette boutique',
          couleur: 'gray',
          actions: ['Enregistrer un premier paiement']
        }
      });
    }

    const alerte = ajouterAlertePaiement(dernierPaiement);
    const maintenant = new Date();

    res.json({
      success: true,
      boutique: {
        id: boutique._id,
        nom: boutique.nom,
        box: boutique.box
      },
      situation: {
        statut: alerte.statut,
        message: alerte.message,
        couleur: alerte.couleur,
        date_dernier_paiement: dernierPaiement.date_paiement,
        date_prochaine_echeance: dernierPaiement.date_fin,
        jours_restants: alerte.jours_restants,
        jours_ecoules: alerte.jours_ecoules,
        montant: dernierPaiement.montant,
        periode: dernierPaiement.periode
      },
      actions_recommandees: getActionsRecommandees(alerte.statut)
    });

  } catch (error) {
    console.error('❌ Erreur verifierSituationBoutique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification'
    });
  }
};

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Ajoute une alerte de situation à un paiement
 * @param {Object} paiement - Le paiement à évaluer
 * @returns {Object} Paiement avec alerte
 */
function ajouterAlertePaiement(paiement) {
  const maintenant = new Date();
  const dateFin = new Date(paiement.date_fin);
  
  // Calculer la différence en jours
  const diffJours = Math.ceil((dateFin - maintenant) / (1000 * 60 * 60 * 24));
  const joursEcoules = Math.ceil((maintenant - paiement.date_paiement) / (1000 * 60 * 60 * 24));
  
  let statut, message, couleur, icone;

  if (diffJours < 0) {
    // Expiré
    const joursRetard = Math.abs(diffJours);
    statut = 'EXPIRE';
    message = `⚠️ Paiement expiré depuis ${joursRetard} jour${joursRetard > 1 ? 's' : ''}`;
    couleur = 'red';
    icone = '❌';
  } else if (diffJours <= 7) {
    // Bientôt expiré (moins de 7 jours)
    statut = 'BIENTOT_EXPIRE';
    message = `⏰ Paiement expire dans ${diffJours} jour${diffJours > 1 ? 's' : ''}`;
    couleur = 'orange';
    icone = '⚠️';
  } else {
    // En règle
    statut = 'EN_REGLE';
    message = `✅ En règle - Prochain paiement dans ${diffJours} jours`;
    couleur = 'green';
    icone = '✓';
  }

  return {
    ...paiement,
    alerte: {
      statut,
      message,
      couleur,
      icone,
      jours_restants: diffJours > 0 ? diffJours : 0,
      jours_ecoules: joursEcoules,
      date_analyse: new Date()
    }
  };
}

/**
 * Obtient les actions recommandées selon le statut
 * @param {string} statut - Le statut du paiement
 * @returns {Array} Liste d'actions recommandées
 */
function getActionsRecommandees(statut) {
  const actions = {
    'EXPIRE': [
      'Contacter la boutique immédiatement',
      'Envoyer un rappel de paiement',
      'Suspendre les accès si nécessaire'
    ],
    'BIENTOT_EXPIRE': [
      'Envoyer un rappel automatique',
      'Préparer la relance',
      'Vérifier les coordonnées de paiement'
    ],
    'EN_REGLE': [
      'Aucune action requise',
      'Planifier le prochain rappel'
    ],
    'AUCUN_PAIEMENT': [
      'Contacter la boutique',
      'Enregistrer le premier paiement',
      'Vérifier les modalités'
    ]
  };

  return actions[statut] || ['Aucune action recommandée'];
}

/**
 * Obtenir les statistiques globales des paiements
 * @returns {Object} Statistiques
 */
async function getStatsPaiements() {
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59);

  const stats = await Paiement.aggregate([
    {
      $facet: {
        global: [
          {
            $group: {
              _id: null,
              total_paiements: { $sum: 1 },
              montant_total: { $sum: '$montant' },
              montant_moyen: { $avg: '$montant' }
            }
          }
        ],
        par_periode: [
          {
            $group: {
              _id: '$periode',
              count: { $sum: 1 },
              total: { $sum: '$montant' }
            }
          }
        ],
        paiements_mois: [
          {
            $match: {
              date_paiement: { $gte: debutMois, $lte: finMois }
            }
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              total: { $sum: '$montant' }
            }
          }
        ],
        echeances_mois: [
          {
            $match: {
              date_fin: { $gte: debutMois, $lte: finMois }
            }
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              total: { $sum: '$montant' }
            }
          }
        ]
      }
    }
  ]);

  return {
    global: stats[0]?.global[0] || { total_paiements: 0, montant_total: 0, montant_moyen: 0 },
    par_periode: stats[0]?.par_periode || [],
    paiements_du_mois: stats[0]?.paiements_mois[0] || { count: 0, total: 0 },
    echeances_du_mois: stats[0]?.echeances_mois[0] || { count: 0, total: 0 }
  };
}

module.exports = {
  createPaiement,
  getAllPaiements,
  getPaiementsByBoutique,
  getPaiementById,
  updatePaiement,
  deletePaiement,
  getDashboardPaiements,
  verifierSituationBoutique
};