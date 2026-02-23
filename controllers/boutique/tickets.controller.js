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

// @desc    Ajouter un message (extension possible)
// @route   POST /api/boutique/tickets/:id/messages
const addMessage = async (req, res) => {
  try {
    // Ici vous pouvez étendre le modèle Ticket pour inclure des messages
    // Actuellement, le modèle ticket n'a pas de champ messages
    // Je suggère d'ajouter un champ "messages: [{ texte, auteur, date }]"
    
    res.status(501).json({ 
      message: 'Fonctionnalité à implémenter - Extension du modèle Ticket nécessaire' 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
const reopenTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { 
        statut: 'OUVERT',
        resolvedAt: null
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
  reopenTicket,
  deleteTicket,
  addMessage
};
