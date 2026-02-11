const mongoose = require('mongoose');

const boxHistoriqueSchema = new mongoose.Schema({
  box: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Box',
    required: true
  },
  boutique: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  date_debut: {
    type: Date,
    required: true
  },
  date_fin: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BoxHistorique', boxHistoriqueSchema);