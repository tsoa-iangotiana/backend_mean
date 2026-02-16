const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['acheteur', 'boutique','admin'], default: 'acheteur' },
  active: { type: Boolean, default: true },
  password: { type: String, required: true }
}, { timestamps: true });


userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};


module.exports = mongoose.model('User', userSchema);