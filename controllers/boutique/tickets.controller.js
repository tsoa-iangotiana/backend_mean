const Ticket = require('../../models/ticket.model');

// @desc    Créer un ticket de support
// @route   POST /api/boutique/tickets
const createTicket = async (req, res) => {
  try {
    const { sujet, description, priorite = 'MOYENNE' } = req.body;

    const ticket = await Ticket.create({
      boutique: req.boutique._id,
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
    
    let query = { boutique: req.boutique._id };
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
      _id: req.params.id,
      boutique: req.boutique._id
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

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  addMessage
};