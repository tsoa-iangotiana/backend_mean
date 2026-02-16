const mongoose = require('mongoose');

const produitSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  prix: {
    type: Number,
    required: true,
    min: 0
  },
  unite: {
    type: String,
    enum: ['unite', 'kg', 'litre', 'metre'],
    default: 'unite'
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  images: [{
    type: String
  }],
  categorie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categorie',
    required: true
  },
  boutique: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  actif: {
    type: Boolean,
    default: true
  },
  note_moyenne: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Produit', produitSchema);