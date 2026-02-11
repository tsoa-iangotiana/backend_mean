const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  produits: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produit'
  }],
  reduction: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  date_debut: {
    type: Date,
    required: true
  },
  date_fin: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Promotion', promotionSchema);