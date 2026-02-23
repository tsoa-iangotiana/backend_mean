const Paiement = require('../../models/paiement.model');
const Boutique = require('../../models/boutique.model');
const Box = require('../../models/box.model');

// controllers/boutique/paiement.controller.js
const getSituationLoyer = async (req, res) => {
  try {
    // Récupérer l'ID depuis les paramètres de requête (query params)
    const { boutiqueId } = req.query;
    
    console.log("🔍 getSituationLoyer - boutiqueId reçu:", boutiqueId);

    if (!boutiqueId) {
      return res.status(400).json({ 
        message: 'ID de la boutique requis' 
      });
    }

    const maintenant = new Date();
    
    // Dernier paiement
    const dernierPaiement = await Paiement.findOne({
      boutique: boutiqueId
    }).sort('-date_fin');

    // Paiement actif
    const paiementActif = await Paiement.findOne({
      boutique: boutiqueId,
      date_fin: { $gte: maintenant }
    }).sort('-date_fin');

    // Récupérer la boutique avec son box
    const boutique = await Boutique.findById(boutiqueId).populate('box');
    
    if (!boutique) {
      return res.status(404).json({ message: 'Boutique non trouvée' });
    }

    // Calculer les jours restants
    let joursRestants = 0;
    let statut = 'A_JOUR';
    
    if (paiementActif) {
      joursRestants = Math.ceil((paiementActif.date_fin - maintenant) / (1000 * 60 * 60 * 24));
    } else {
      statut = 'RETARD';
    }

    res.json({
      boutique: boutique.nom,
      box: boutique.box?.numero || 'Non assigné',
      loyer_mensuel: boutique.box?.prix_loyer || 0,
      situation: {
        statut,
        dernier_paiement: dernierPaiement?.date_paiement || null,
        prochaine_echeance: paiementActif?.date_fin || null,
        jours_restants: joursRestants,
        periode_en_cours: paiementActif?.periode || null,
        montant_paye: dernierPaiement?.montant || 0
      }
    });

  } catch (error) {
    console.error("❌ Erreur getSituationLoyer:", error);
    res.status(500).json({ message: error.message });
  }
};

// Pour le paiement (en POST)
const payerLoyer = async (req, res) => {
  try {
    const { periode, montant, boutiqueId } = req.body;
    
    console.log("💰 payerLoyer - boutiqueId:", boutiqueId);
    console.log("💰 payerLoyer - periode:", periode);

    if (!boutiqueId) {
      return res.status(400).json({ message: 'ID de la boutique requis' });
    }

    // Récupérer le box de la boutique pour le prix du loyer
    const boutique = await Boutique.findById(boutiqueId).populate('box');
    
    if (!boutique) {
      return res.status(404).json({ message: 'Boutique non trouvée' });
    }

    if (!boutique.box) {
      return res.status(400).json({ message: 'Aucun box assigné à cette boutique' });
    }

    // Calculer la date de fin selon la période
    const dateDebut = new Date();
    let dateFin = new Date();
    
    switch(periode) {
      case 'mensuel':
        dateFin.setMonth(dateFin.getMonth() + 1);
        break;
      case 'trimestriel':
        dateFin.setMonth(dateFin.getMonth() + 3);
        break;
      case 'annuel':
        dateFin.setFullYear(dateFin.getFullYear() + 1);
        break;
      default:
        return res.status(400).json({ message: 'Période invalide' });
    }

    const paiement = await Paiement.create({
      boutique: boutiqueId,
      montant: montant || boutique.box.prix_loyer,
      date_paiement: dateDebut,
      date_fin: dateFin,
      periode
    });

    res.status(201).json({
      message: 'Paiement enregistré avec succès',
      paiement: {
        id: paiement._id,
        montant: paiement.montant,
        date_fin: paiement.date_fin,
        periode: paiement.periode
      }
    });

  } catch (error) {
    console.error("❌ Erreur payerLoyer:", error);
    res.status(500).json({ message: error.message });
  }
};

// Pour l'historique
const getHistoriquePaiements = async (req, res) => {
  try {
    const { boutiqueId } = req.query;

    if (!boutiqueId) {
      return res.status(400).json({ message: 'ID de la boutique requis' });
    }

    const paiements = await Paiement.find({
      boutique: boutiqueId
    }).sort('-date_paiement');

    const totalDepense = paiements.reduce((sum, p) => sum + p.montant, 0);

    res.json({
      total_paiements: paiements.length,
      montant_total: totalDepense,
      paiements: paiements.map(p => ({
        id: p._id,
        montant: p.montant,
        date_paiement: p.date_paiement,
        date_fin: p.date_fin,
        periode: p.periode,
        statut: p.date_fin < new Date() ? 'EXPIRE' : 'ACTIF'
      }))
    });

  } catch (error) {
    console.error("❌ Erreur getHistoriquePaiements:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  payerLoyer,
  getSituationLoyer,
  getHistoriquePaiements
};