const mongoose = require('mongoose');

const boutiqueSchema = new mongoose.Schema({
  profil_photo: {
    type: String,
    default: null
  },
  slogan: {
    type: String,
    default: null
  },
  condition_vente:{
    type: String,
    default: null
  },
  contact:[{
    type: String,
    default: []
  }],
  nom: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  box: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Box'
  },
  responsable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  active: {
    type: Boolean,
    default: true
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categorie'
  }],
  note_moyenne: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Boutique', boutiqueSchema);