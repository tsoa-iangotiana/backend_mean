const Ticket = require('../../models/ticket.model');
const mongoose = require('mongoose');
// @desc    Créer un ticket de support
// @route   POST /api/boutique/tickets
const createTicket = async (req, res) => {
  try {
    const { sujet, description, priorite = 'MOYENNE' } = req.body;
    const { boutiqueId} = req.query;
    if(!boutiqueId){
      return res.status(400).json({ message: 'ID de la boutique requis' });
    }
    const ticket = await Ticket.create({
      boutique: boutiqueId,
      sujet,
      description,
      priorite,
      statut: 'OUVERT'
    });

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Liste des tickets de la boutique
// @route   GET /api/boutique/tickets
const getTickets = async (req, res) => {
  try {
    const { statut, priorite } = req.query;
    const { boutiqueId} = req.query;
    let query = { boutique: boutiqueId };
    if (statut) query.statut = statut;
    if (priorite) query.priorite = priorite;

    const tickets = await Ticket.find(query)
      .sort('-createdAt');

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// controllers/boutique/tickets.controller.js
const getAllTickets = async (req, res) => {
  try {
    const { statut, priorite, boutiqueId, search, dateDebut, dateFin, tri } = req.query;
    
    // Paramètres de pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Construction de la requête
    let query = {};
    
    // Filtres
    if (boutiqueId) query.boutique = boutiqueId;
    if (statut) query.statut = statut;
    if (priorite) query.priorite = priorite;
    
    // RECHERCHE TEXTUELLE
    if (search) {
      query.$or = [
        { sujet: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // FILTRE DE DATE - CORRECTION IMPORTANTE
    if (dateDebut || dateFin) {
      query.createdAt = {};
      
      if (dateDebut) {
        const debut = new Date(dateDebut);
        debut.setHours(0, 0, 0, 0);
        query.createdAt.$gte = debut;
        console.log('📅 Date début (filtre):', debut);
      }
      
      if (dateFin) {
        const fin = new Date(dateFin);
        fin.setHours(23, 59, 59, 999);
        query.createdAt.$lte = fin;
        console.log('📅 Date fin (filtre):', fin);
      }
    }

    console.log('🔍 Query MongoDB:', JSON.stringify(query, null, 2));

    // Exécution de la requête
    const tickets = await Ticket.find(query)
      .sort(tri || '-createdAt')
      .skip(skip)
      .limit(limit)
      .populate('boutique', 'nom email');

    // Compter le total
    const total = await Ticket.countDocuments(query);

    console.log(`📊 Tickets trouvés: ${tickets.length} / Total: ${total}`);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Erreur getAllTickets:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Détail d'un ticket
// @route   GET /api/boutique/tickets/:id
const getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addCommentaire = async (req, res) => {
  try {
    const { id } = req.params;
    const { texte } = req.body;
    const user = req.user; // Utilisateur connecté (admin)
    const { boutiqueId } = req.query; // Si appelé par une boutique

    if (!texte || texte.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Le texte du commentaire est requis' 
      });
    }

    // Récupérer le ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ticket non trouvé' 
      });
    }

    // Déterminer qui est l'auteur
    let auteurType, auteurId, auteurRef;

    if (boutiqueId) {
      // Commentaire venant d'une boutique
      // Vérifier que la boutique a le droit de commenter ce ticket
      if (ticket.boutique.toString() !== boutiqueId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Vous n\'êtes pas autorisé à commenter ce ticket' 
        });
      }
      auteurType = 'boutique';
      auteurId = boutiqueId;
      auteurRef = 'Boutique';
    } else if (user) {
      // Commentaire venant d'un admin
      auteurType = 'user';
      auteurId = user._id;
      auteurRef = 'User';
    } else {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentification requise' 
      });
    }

    // Créer le commentaire
    const commentaire = {
      auteurType,
      auteur: auteurId,
      auteurRef,
      texte: texte.trim(),
      date: new Date(),
      type: 'commentaire'
    };

    // Ajouter le commentaire au ticket
    ticket.commentaires = ticket.commentaires || [];
    ticket.commentaires.push(commentaire);

    // Si le ticket était résolu et qu'on le rouvre via un commentaire
    if (ticket.statut === 'RESOLU') {
      ticket.statut = 'EN_COURS';
      ticket.resolvedAt = null;
      
      // Ajouter un message système
      ticket.commentaires.push({
        auteurType: 'systeme',
        auteur: null,
        auteurRef: null,
        texte: 'Ticket réouvert suite à un nouveau commentaire',
        date: new Date(),
        type: 'reouverture'
      });
    }

    // Sauvegarder
    await ticket.save();

    // Peupler les informations de l'auteur pour la réponse
    await ticket.populate({
      path: 'commentaires.auteur',
      select: 'nom email profil_photo'
    });

    // Récupérer le dernier commentaire ajouté
    const nouveauCommentaire = ticket.commentaires[ticket.commentaires.length - 1];

    res.status(201).json({
      success: true,
      message: 'Commentaire ajouté avec succès',
      commentaire: nouveauCommentaire,
      ticket: {
        _id: ticket._id,
        statut: ticket.statut,
        commentairesCount: ticket.commentaires.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur addCommentaire:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'ajout du commentaire',
      error: error.message 
    });
  }
};

// @desc    Ajouter un commentaire système (interne)
// @route   POST /api/tickets/:id/commentaires/systeme
// @access  Private (admin uniquement)
const addSystemComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { texte, type } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentification requise' 
      });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ticket non trouvé' 
      });
    }

    const commentaire = {
      auteurType: 'user',
      auteur: user._id,
      auteurRef: 'User',
      texte: texte.trim(),
      date: new Date(),
      type: type || 'commentaire'
    };

    ticket.commentaires = ticket.commentaires || [];
    ticket.commentaires.push(commentaire);
    await ticket.save();

    res.status(201).json({
      success: true,
      message: 'Commentaire système ajouté',
      commentaire
    });

  } catch (error) {
    console.error('❌ Erreur addSystemComment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'ajout du commentaire système' 
    });
  }
};

// @desc    Récupérer tous les commentaires d'un ticket
// @route   GET /api/tickets/:id/commentaires
// @access  Private (admin ou boutique concernée)
const getCommentaires = async (req, res) => {
  try {
    const { id } = req.params;
    const { boutiqueId } = req.query;
    const user = req.user;

    const ticket = await Ticket.findById(id)
      .populate({
        path: 'commentaires.auteur',
        select: 'nom email profil_photo'
      });

    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ticket non trouvé' 
      });
    }

    // Vérifier les droits
    if (boutiqueId && ticket.boutique.toString() !== boutiqueId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }

    res.json({
      success: true,
      commentaires: ticket.commentaires || [],
      total: ticket.commentaires?.length || 0
    });

  } catch (error) {
    console.error('❌ Erreur getCommentaires:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des commentaires' 
    });
  }
};

// @desc    Supprimer un commentaire
// @route   DELETE /api/tickets/:ticketId/commentaires/:commentaireId
// @access  Private (admin uniquement)
const deleteCommentaire = async (req, res) => {
  try {
    const { ticketId, commentaireId } = req.params;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ticket non trouvé' 
      });
    }

    // Filtrer pour supprimer le commentaire
    ticket.commentaires = ticket.commentaires.filter(
      c => c._id.toString() !== commentaireId
    );

    await ticket.save();

    res.json({
      success: true,
      message: 'Commentaire supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur deleteCommentaire:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la suppression du commentaire' 
    });
  }
};
const getAdminTicketStats = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;
    
    // Filtre optionnel par date
    let dateFilter = {};
    if (dateDebut || dateFin) {
      dateFilter.createdAt = {};
      if (dateDebut) dateFilter.createdAt.$gte = new Date(dateDebut);
      if (dateFin) dateFilter.createdAt.$lte = new Date(dateFin);
    }

    // Statistiques globales
    const globalStats = await Ticket.aggregate([
      { $match: dateFilter },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        ouvert: { $sum: { $cond: [{ $eq: ['$statut', 'OUVERT'] }, 1, 0] } },
        enCours: { $sum: { $cond: [{ $eq: ['$statut', 'EN_COURS'] }, 1, 0] } },
        resolu: { $sum: { $cond: [{ $eq: ['$statut', 'RESOLU'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priorite', 'URGENT'] }, 1, 0] } },
        hautPriorite: { $sum: { $cond: [{ $eq: ['$priorite', 'HAUTE'] }, 1, 0] } },
        moyennePriorite: { $sum: { $cond: [{ $eq: ['$priorite', 'MOYENNE'] }, 1, 0] } },
        bassePriorite: { $sum: { $cond: [{ $eq: ['$priorite', 'BASSE'] }, 1, 0] } }
      } }
    ]);

    // Statistiques par boutique
    const statsParBoutique = await Ticket.aggregate([
      { $match: dateFilter },
      { $group: {
        _id: "$boutique",
        count: { $sum: 1 },
        ouvert: { $sum: { $cond: [{ $eq: ['$statut', 'OUVERT'] }, 1, 0] } },
        enCours: { $sum: { $cond: [{ $eq: ['$statut', 'EN_COURS'] }, 1, 0] } },
        resolu: { $sum: { $cond: [{ $eq: ['$statut', 'RESOLU'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priorite', 'URGENT'] }, 1, 0] } }
      } },
      { $lookup: {
        from: 'boutiques',
        localField: '_id',
        foreignField: '_id',
        as: 'boutiqueInfo'
      } },
      { $unwind: { path: '$boutiqueInfo', preserveNullAndEmptyArrays: true } },
      { $project: {
        boutiqueId: '$_id',
        nom: '$boutiqueInfo.nom',
        email: '$boutiqueInfo.email',
        count: 1,
        ouvert: 1,
        enCours: 1,
        resolu: 1,
        urgent: 1
      } },
      { $sort: { count: -1 } }
    ]);

    const result = globalStats[0] || {
      total: 0,
      ouvert: 0,
      enCours: 0,
      resolu: 0,
      urgent: 0,
      hautPriorite: 0,
      moyennePriorite: 0,
      bassePriorite: 0
    };

    res.json({
      success: true,
      ...result,
      parBoutique: statsParBoutique,
      periode: dateDebut || dateFin ? {
        debut: dateDebut || null,
        fin: dateFin || null
      } : null
    });

  } catch (error) {
    console.error('❌ Erreur stats tickets admin:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
// @desc    Obtenir les statistiques des tickets
// @route   GET /api/boutique/tickets/stats
const getTicketStats = async (req, res) => {
  try {
    const { boutiqueId } = req.query;
    
    if (!boutiqueId) {
      return res.status(400).json({ message: 'ID de la boutique requis' });
    }

    const stats = await Ticket.aggregate([
      { $match: { boutique: new mongoose.Types.ObjectId(boutiqueId) } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        ouvert: { $sum: { $cond: [{ $eq: ['$statut', 'OUVERT'] }, 1, 0] } },
        enCours: { $sum: { $cond: [{ $eq: ['$statut', 'EN_COURS'] }, 1, 0] } },
        resolu: { $sum: { $cond: [{ $eq: ['$statut', 'RESOLU'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priorite', 'URGENT'] }, 1, 0] } },
        hautPriorite: { $sum: { $cond: [{ $eq: ['$priorite', 'HAUTE'] }, 1, 0] } }
      } }
    ]);

    const result = stats[0] || {
      total: 0,
      ouvert: 0,
      enCours: 0,
      resolu: 0,
      urgent: 0,
      hautPriorite: 0
    };

    res.json(result);
  } catch (error) {
    console.error('❌ Erreur stats tickets:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Rechercher des tickets
// @route   GET /api/boutique/tickets/search
const searchTickets = async (req, res) => {
  try {
    const { q, boutiqueId } = req.query;
    
    if (!boutiqueId) {
      return res.status(400).json({ message: 'ID de la boutique requis' });
    }

    const tickets = await Ticket.find({
      boutique: boutiqueId,
      $or: [
        { sujet: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    }).sort('-createdAt');

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir les tickets par statut
// @route   GET /api/boutique/tickets/statut/:statut
const getTicketsByStatus = async (req, res) => {
  try {
    const { statut } = req.params;
    const { boutiqueId } = req.query;

    const tickets = await Ticket.find({
      boutique: boutiqueId,
      statut: statut
    }).sort('-createdAt');

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir les tickets par priorité
// @route   GET /api/boutique/tickets/priorite/:priorite
const getTicketsByPriority = async (req, res) => {
  try {
    const { priorite } = req.params;
    const { boutiqueId } = req.query;

    const tickets = await Ticket.find({
      boutique: boutiqueId,
      priorite: priorite
    }).sort('-createdAt');

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour le statut d'un ticket
// @route   PATCH /api/boutique/tickets/:id/statut
const updateTicketStatus = async (req, res) => {
  try {
    const { statut } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour la priorité d'un ticket
// @route   PATCH /api/boutique/tickets/:id/priorite
const updateTicketPriority = async (req, res) => {
  try {
    const { priorite } = req.body;
    console.log('Mise à jour de la priorité du ticket', req.params.id, 'à', priorite);
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { priorite },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Résoudre un ticket
// @route   POST /api/boutique/tickets/:id/resoudre
const resolveTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { 
        statut: 'RESOLU',
        resolvedAt: new Date()
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Rouvrir un ticket
// @route   POST /api/boutique/tickets/:id/rouvrir


// @desc    Supprimer un ticket
// @route   DELETE /api/boutique/tickets/:id
const deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    res.json({ message: 'Ticket supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  createTicket,
  getTickets,
  getTicket,
  getTicketStats,
  searchTickets,
  getTicketsByStatus,
  getTicketsByPriority,
  updateTicketStatus,
  updateTicketPriority,
  resolveTicket,
  deleteTicket,
  getAllTickets,
 addCommentaire,
  addSystemComment,
  getCommentaires,
  deleteCommentaire,
  getAdminTicketStats
};
