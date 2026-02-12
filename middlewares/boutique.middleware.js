const Boutique = require('../models/boutique.model');

const estBoutique = async (req, res, next) => {
  try {
    if (req.user.role !== 'boutique') {
      return res.status(403).json({ message: 'Accès réservé aux boutiques' });
    }

    // Récupérer la boutique associée à l'utilisateur
    const boutique = await Boutique.findOne({ responsable: req.user._id });
    
    if (!boutique) {
      return res.status(404).json({ message: 'Boutique non trouvée' });
    }

    if (!boutique.active) {
      return res.status(403).json({ message: 'Boutique désactivée' });
    }

    req.boutique = boutique;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifierPaiement = async (req, res, next) => {
  try {
    const Paiement = require('../models/paiement.model');
    const maintenant = new Date();

    const paiementValide = await Paiement.findOne({
      boutique: req.boutique._id,
      date_fin: { $gte: maintenant }
    });

    if (!paiementValide) {
      return res.status(403).json({ 
        message: 'Paiement de loyer requis',
        code: 'PAIEMENT_REQUIS'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { estBoutique, verifierPaiement };