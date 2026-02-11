const mongoose = require('mongoose');

const avisSchema = new mongoose.Schema({
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cible_type: {
    type: String,
    enum: ['PRODUIT', 'BOUTIQUE'],
    required: true
  },
  cible_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'cible_type'
  },
  note: {
    type: Number,
    required: true,
    min: 0,
    max: 5
  },
  commentaire: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Avis', avisSchema);