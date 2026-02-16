const mongoose = require('mongoose');

const boxSchema = new mongoose.Schema({
  numero: {
    type: String,
    required: true,
    unique: true
  },
  surface: {
    type: Number,
    required: true
  },
  prix_loyer: {
    type: Number,
    required: true
  },
  libre: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Box', boxSchema);