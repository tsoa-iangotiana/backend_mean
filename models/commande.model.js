const mongoose = require('mongoose');

const commandeSchema = new mongoose.Schema({
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  boutique: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  items: [{
    produit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Produit',
      required: true
    },
    prix_unitaire: {
      type: Number,
      required: true
    },
    quantite: {
      type: Number,
      required: true
    }
  }],
 livraison: {
  type: new mongoose.Schema({
    adresse: {
      type: String,
      required: true
    },
    distance: {
      type: Number,
      required: true
    },
    frais: {
      type: Number,
      required: true
    }
  }, { _id: false }),
  required: false,  // ✅ ici "required" est bien une option du champ parent
  default: null
},
  montant_total: {
    type: Number,
    required: true
  },
  statut: {
    type: String,
    enum: ['PAYEE', 'ANNULEE', 'EN_ATTENTE', 'LIVREE', 'RECUPEREE'],
    default: 'EN_ATTENTE'
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Commande', commandeSchema);