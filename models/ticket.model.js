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