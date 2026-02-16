const mongoose = require('mongoose');

const favorisSchema = new mongoose.Schema({
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  produits: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produit'
  }],
  boutiques: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Favoris', favorisSchema);