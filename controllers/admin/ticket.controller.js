const Ticket = require('../models/ticket.model');
const Boutique = require('../models/boutique.model');
const mongoose = require('mongoose');


// @desc    Obtenir tous les tickets avec filtres
// @route   GET /api/tickets
// @access  Private (Admin)
const getAllTickets = async (req, res) => {
  try {
    const {
      statut,
      priorite,
      boutiqueId,
      search,
      date_debut,
      date_fin,
      tri = 'date_desc',
      page = 1,
      limit = 20
    } = req.query;

    // Construction du filtre
    const filter = {};

    if (statut) {
      const statuts = statut.split(',');
      filter.statut = { $in: statuts };
    }

    if (priorite) {
      const priorites = priorite.split(',');
      filter.priorite = { $in: priorites };
    }

    if (boutiqueId) {
      filter.boutique = boutiqueId;
    }

    // Recherche textuelle
    if (search) {
      filter.$or = [
        { sujet: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
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

    // Configuration du tri
    let sort = {};
    switch (tri) {
      case 'date_asc':
        sort = { createdAt: 1 };
        break;
      case 'date_desc':
        sort = { createdAt: -1 };
        break;
      case 'priorite_desc':
        sort = { priorite: -1, createdAt: -1 };
        break;
      case 'priorite_asc':
        sort = { priorite: 1, createdAt: -1 };
        break;
      case 'statut':
        sort = { statut: 1, createdAt: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les tickets
    const tickets = await Ticket.find(filter)
      .populate('boutique', 'nom box')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Ticket.countDocuments(filter);

    // Statistiques
    const stats = await getTicketStats();

    // Enrichir avec le temps de résolution
    const ticketsEnrichis = tickets.map(ticket => ({
      ...formatTicketResponse(ticket),
      temps_resolution: ticket.resolvedAt ? 
        calculerTempsResolution(ticket.createdAt, ticket.resolvedAt) : null
    }));

    res.json({
      success: true,
      tickets: ticketsEnrichis,
      statistiques: stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filtres_appliques: {
        statut: statut || 'tous',
        priorite: priorite || 'toutes',
        recherche: search || null,
        date_debut: date_debut || null,
        date_fin: date_fin || null,
        tri
      }
    });

  } catch (error) {
    console.error('❌ Erreur getAllTickets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tickets'
    });
  }
};

// @desc    Obtenir les tickets d'une boutique
// @route   GET /api/tickets/boutique/:boutiqueId
// @access  Private (Boutique ou Admin)
const getTicketsByBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const { statut, page = 1, limit = 10 } = req.query;

    // Vérifier les permissions
    if (req.user.role !== 'admin' && req.user.boutique?.toString() !== boutiqueId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Vérifier que la boutique existe
    const boutique = await Boutique.findById(boutiqueId);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    const filter = { boutique: boutiqueId };
    if (statut) {
      filter.statut = statut;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tickets = await Ticket.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Ticket.countDocuments(filter);

    // Statistiques pour cette boutique
    const stats = await Ticket.aggregate([
      {
        $match: { boutique: new mongoose.Types.ObjectId(boutiqueId) }
      },
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsFormatted = {
      OUVERT: 0,
      EN_COURS: 0,
      RESOLU: 0
    };
    stats.forEach(s => statsFormatted[s._id] = s.count);

    res.json({
      success: true,
      boutique: {
        id: boutique._id,
        nom: boutique.nom
      },
      tickets: tickets.map(t => formatTicketResponse(t)),
      statistiques: statsFormatted,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Erreur getTicketsByBoutique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tickets'
    });
  }
};

// @desc    Obtenir un ticket par ID
// @route   GET /api/tickets/:ticketId
// @access  Private (Boutique concernée ou Admin)
const getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId)
      .populate('boutique', 'nom box responsable')
      .lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && 
        req.user.boutique?.toString() !== ticket.boutique._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Calculer le temps de résolution si résolu
    const tempsResolution = ticket.resolvedAt ?
      calculerTempsResolution(ticket.createdAt, ticket.resolvedAt) : null;

    // Suggestions de tickets similaires
    const ticketsSimilaires = await Ticket.find({
      _id: { $ne: ticketId },
      boutique: ticket.boutique._id,
      $or: [
        { sujet: { $regex: ticket.sujet.split(' ').slice(0, 3).join('|'), $options: 'i' } },
        { priorite: ticket.priorite }
      ]
    })
      .limit(3)
      .select('sujet statut priorite createdAt')
      .lean();

    res.json({
      success: true,
      ticket: {
        ...formatTicketResponse(ticket),
        temps_resolution: tempsResolution
      },
      tickets_similaires: ticketsSimilaires.map(t => ({
        id: t._id,
        sujet: t.sujet,
        statut: t.statut,
        priorite: t.priorite,
        date: t.createdAt
      }))
    });

  } catch (error) {
    console.error('❌ Erreur getTicketById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du ticket'
    });
  }
};

// @desc    Mettre à jour un ticket
// @route   PUT /api/tickets/:ticketId
// @access  Private (Admin)
const updateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { sujet, description, priorite } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    // Mise à jour
    if (sujet) ticket.sujet = sujet;
    if (description) ticket.description = description;
    if (priorite) ticket.priorite = priorite;

    await ticket.save();
    await ticket.populate('boutique', 'nom box');

    res.json({
      success: true,
      message: 'Ticket mis à jour avec succès',
      ticket: formatTicketResponse(ticket)
    });

  } catch (error) {
    console.error('❌ Erreur updateTicket:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du ticket'
    });
  }
};

// @desc    Changer le statut d'un ticket
// @route   PATCH /api/tickets/:ticketId/statut
// @access  Private (Admin)
const changeStatut = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { statut } = req.body;

    if (!statut || !['OUVERT', 'EN_COURS', 'RESOLU'].includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    // Si on passe à RESOLU, enregistrer la date
    if (statut === 'RESOLU' && ticket.statut !== 'RESOLU') {
      ticket.resolvedAt = new Date();
    }

    // Si on réouvre un ticket résolu
    if (statut !== 'RESOLU' && ticket.statut === 'RESOLU') {
      ticket.resolvedAt = null;
    }

    const ancienStatut = ticket.statut;
    ticket.statut = statut;
    await ticket.save();
    await ticket.populate('boutique', 'nom box');

    // Calculer le temps de résolution si applicable
    const tempsResolution = ticket.resolvedAt ?
      calculerTempsResolution(ticket.createdAt, ticket.resolvedAt) : null;

    res.json({
      success: true,
      message: `Statut du ticket changé de ${ancienStatut} à ${statut}`,
      ticket: {
        ...formatTicketResponse(ticket),
        temps_resolution: tempsResolution
      }
    });

  } catch (error) {
    console.error('❌ Erreur changeStatut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de statut'
    });
  }
};

// @desc    Changer la priorité d'un ticket
// @route   PATCH /api/tickets/:ticketId/priorite
// @access  Private (Admin)
const changePriorite = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { priorite } = req.body;

    if (!priorite || !['BASSE', 'MOYENNE', 'HAUTE', 'URGENT'].includes(priorite)) {
      return res.status(400).json({
        success: false,
        message: 'Priorité invalide'
      });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    const anciennePriorite = ticket.priorite;
    ticket.priorite = priorite;
    await ticket.save();
    await ticket.populate('boutique', 'nom box');

    res.json({
      success: true,
      message: `Priorité du ticket changée de ${anciennePriorite} à ${priorite}`,
      ticket: formatTicketResponse(ticket)
    });

  } catch (error) {
    console.error('❌ Erreur changePriorite:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de priorité'
    });
  }
};

// @desc    Résoudre un ticket (raccourci)
// @route   POST /api/tickets/:ticketId/resoudre
// @access  Private (Admin)
const resoudreTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { solution } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    if (ticket.statut === 'RESOLU') {
      return res.status(400).json({
        success: false,
        message: 'Ce ticket est déjà résolu'
      });
    }

    ticket.statut = 'RESOLU';
    ticket.resolvedAt = new Date();
    ticket.solution = solution || 'Ticket résolu';
    ticket.resolvedBy = req.user._id;

    await ticket.save();
    await ticket.populate('boutique', 'nom box');

    const tempsResolution = calculerTempsResolution(ticket.createdAt, ticket.resolvedAt);

    res.json({
      success: true,
      message: 'Ticket résolu avec succès',
      ticket: {
        ...formatTicketResponse(ticket),
        temps_resolution: tempsResolution,
        solution: ticket.solution
      }
    });

  } catch (error) {
    console.error('❌ Erreur resoudreTicket:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la résolution du ticket'
    });
  }
};

// @desc    Supprimer un ticket
// @route   DELETE /api/tickets/:ticketId
// @access  Private (Admin)
const deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findByIdAndDelete(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Ticket supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur deleteTicket:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du ticket'
    });
  }
};

// @desc    Obtenir le dashboard des tickets
// @route   GET /api/tickets/dashboard
// @access  Private (Admin)
const getDashboardTickets = async (req, res) => {
  try {
    const maintenant = new Date();
    const debutJour = new Date(maintenant.setHours(0, 0, 0, 0));
    const finJour = new Date(maintenant.setHours(23, 59, 59, 999));

    // Statistiques globales
    const stats = await Ticket.aggregate([
      {
        $facet: {
          parStatut: [
            {
              $group: {
                _id: '$statut',
                count: { $sum: 1 }
              }
            }
          ],
          parPriorite: [
            {
              $group: {
                _id: '$priorite',
                count: { $sum: 1 }
              }
            }
          ],
          ticketsAjourdhui: [
            {
              $match: {
                createdAt: { $gte: debutJour, $lte: finJour }
              }
            },
            {
              $count: 'count'
            }
          ],
          tempsMoyenResolution: [
            {
              $match: {
                statut: 'RESOLU',
                resolvedAt: { $exists: true }
              }
            },
            {
              $project: {
                temps: {
                  $divide: [
                    { $subtract: ['$resolvedAt', '$createdAt'] },
                    1000 * 60 * 60 // en heures
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                moyenne: { $avg: '$temps' }
              }
            }
          ],
          ticketsUrgents: [
            {
              $match: {
                priorite: 'URGENT',
                statut: { $ne: 'RESOLU' }
              }
            },
            { $count: 'count' }
          ]
        }
      }
    ]);

    // Tickets récents
    const ticketsRecents = await Ticket.find({ statut: { $ne: 'RESOLU' } })
      .populate('boutique', 'nom')
      .sort('-priorite createdAt')
      .limit(10)
      .lean();

    // Tickets en retard (plus de 48h sans résolution)
    const dateLimite = new Date();
    dateLimite.setHours(dateLimite.getHours() - 48);
    
    const ticketsEnRetard = await Ticket.find({
      statut: { $ne: 'RESOLU' },
      createdAt: { $lte: dateLimite }
    })
      .populate('boutique', 'nom')
      .sort('createdAt')
      .lean();

    res.json({
      success: true,
      dashboard: {
        resume: {
          total: stats[0].parStatut.reduce((acc, s) => acc + s.count, 0),
          par_statut: Object.fromEntries(
            stats[0].parStatut.map(s => [s._id, s.count])
          ),
          par_priorite: Object.fromEntries(
            stats[0].parPriorite.map(p => [p._id, p.count])
          ),
          aujourd_hui: stats[0].ticketsAjourdhui[0]?.count || 0,
          urgents: stats[0].ticketsUrgents[0]?.count || 0,
          temps_moyen_resolution: stats[0].tempsMoyenResolution[0]?.moyenne 
            ? Math.round(stats[0].tempsMoyenResolution[0].moyenne * 10) / 10 + 'h'
            : 'N/A'
        },
        tickets_recents: ticketsRecents.map(t => ({
          id: t._id,
          sujet: t.sujet,
          boutique: t.boutique.nom,
          statut: t.statut,
          priorite: t.priorite,
          date: t.createdAt,
          urgent: t.priorite === 'URGENT'
        })),
        alertes: {
          en_retard: ticketsEnRetard.map(t => ({
            id: t._id,
            sujet: t.sujet,
            boutique: t.boutique.nom,
            delai: Math.ceil((new Date() - t.createdAt) / (1000 * 60 * 60)) + 'h'
          })),
          urgent_non_resolu: ticketsRecents
            .filter(t => t.priorite === 'URGENT' && t.statut !== 'RESOLU')
            .map(t => ({
              id: t._id,
              sujet: t.sujet,
              boutique: t.boutique.nom
            }))
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur getDashboardTickets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du dashboard'
    });
  }
};

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Formate la réponse d'un ticket
 */
function formatTicketResponse(ticket) {
  return {
    id: ticket._id,
    boutique: ticket.boutique,
    sujet: ticket.sujet,
    description: ticket.description,
    statut: ticket.statut,
    priorite: ticket.priorite,
    priorite_info: getPrioriteInfo(ticket.priorite),
    statut_info: getStatutInfo(ticket.statut),
    date_creation: ticket.createdAt,
    date_modification: ticket.updatedAt,
    date_resolution: ticket.resolvedAt,
    delai_actuel: ticket.statut !== 'RESOLU' ?
      calculerDelai(ticket.createdAt) : null
  };
}

/**
 * Obtient les informations sur la priorité
 */
function getPrioriteInfo(priorite) {
  const infos = {
    'BASSE': {
      libelle: 'Basse',
      couleur: 'blue',
      delai_souhaite: '72h'
    },
    'MOYENNE': {
      libelle: 'Moyenne',
      couleur: 'green',
      delai_souhaite: '48h'
    },
    'HAUTE': {
      libelle: 'Haute',
      couleur: 'orange',
      delai_souhaite: '24h'
    },
    'URGENT': {
      libelle: 'Urgent',
      couleur: 'red',
      delai_souhaite: '12h'
    }
  };
  return infos[priorite] || infos['MOYENNE'];
}

/**
 * Obtient les informations sur le statut
 */
function getStatutInfo(statut) {
  const infos = {
    'OUVERT': {
      libelle: 'Ouvert',
      couleur: 'green',
      icon: '🆕'
    },
    'EN_COURS': {
      libelle: 'En cours',
      couleur: 'orange',
      icon: '⚙️'
    },
    'RESOLU': {
      libelle: 'Résolu',
      couleur: 'blue',
      icon: '✅'
    }
  };
  return infos[statut] || infos['OUVERT'];
}

/**
 * Calcule le délai depuis la création
 */
function calculerDelai(dateCreation) {
  const maintenant = new Date();
  const diffHeures = Math.ceil((maintenant - new Date(dateCreation)) / (1000 * 60 * 60));
  
  if (diffHeures < 24) {
    return `${diffHeures}h`;
  } else {
    const jours = Math.floor(diffHeures / 24);
    const heures = diffHeures % 24;
    return `${jours}j ${heures}h`;
  }
}

/**
 * Calcule le temps de résolution
 */
function calculerTempsResolution(dateCreation, dateResolution) {
  const diffHeures = (new Date(dateResolution) - new Date(dateCreation)) / (1000 * 60 * 60);
  
  if (diffHeures < 24) {
    return `${Math.round(diffHeures * 10) / 10}h`;
  } else {
    const jours = Math.floor(diffHeures / 24);
    const heures = Math.round(diffHeures % 24);
    return `${jours}j ${heures}h`;
  }
}

/**
 * Obtient les statistiques des tickets
 */
async function getTicketStats() {
  const stats = await Ticket.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        ouverts: {
          $sum: { $cond: [{ $eq: ['$statut', 'OUVERT'] }, 1, 0] }
        },
        en_cours: {
          $sum: { $cond: [{ $eq: ['$statut', 'EN_COURS'] }, 1, 0] }
        },
        resolus: {
          $sum: { $cond: [{ $eq: ['$statut', 'RESOLU'] }, 1, 0] }
        },
        urgents: {
          $sum: { $cond: [{ $eq: ['$priorite', 'URGENT'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    ouverts: 0,
    en_cours: 0,
    resolus: 0,
    urgents: 0
  };
}

module.exports = {
  createTicket,
  getAllTickets,
  getTicketsByBoutique,
  getTicketById,
  updateTicket,
  changeStatut,
  changePriorite,
  resoudreTicket,
  deleteTicket,
  getDashboardTickets
};