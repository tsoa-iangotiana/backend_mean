const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  boutique: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  sujet: {
    type: String,
    required: true,
    trim: true
  },
  commentaires: [{
    auteurType: {
      type: String,
      enum: ['user', 'boutique'],
      required: true
    },
    auteur: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'commentaires.auteurRef'
    },
    auteurRef: {
      type: String,
      enum: ['User', 'Boutique'],
      required: true
    },
    texte: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  description: {
    type: String,
    required: true
  },
  statut: {
    type: String,
    enum: ['OUVERT', 'EN_COURS', 'RESOLU'],
    default: 'OUVERT'
  },
  priorite: {
    type: String,
    enum: ['BASSE', 'MOYENNE', 'HAUTE', 'URGENT'],
    default: 'MOYENNE'
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Ticket', ticketSchema);