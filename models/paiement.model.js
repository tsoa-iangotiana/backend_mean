const mongoose = require('mongoose');

const paiementSchema = new mongoose.Schema({
  boutique: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  montant: {
    type: Number,
    required: true
  },
  date_paiement: {
    type: Date,
    default: Date.now
  },
  date_fin: {
    type: Date,
    required: true
  },
  periode: {
    type: String,
    enum: ['mensuel', 'trimestriel', 'annuel'],
    default: 'mensuel'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Paiement', paiementSchema);