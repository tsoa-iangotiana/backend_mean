const Avis = require('../../models/avis.model');
const Produit = require('../../models/produit.model');
const Boutique = require('../../models/boutique.model');
const mongoose = require('mongoose');

// @desc    Noter un produit
// @route   POST /api/notes/produit
const noterProduit = async (req, res) => {
  try {
    const { produitId, note } = req.body;
    const utilisateurId = req.user._id;

    // Validation
    if (!produitId || note === undefined) {
      return res.status(400).json({ 
        message: 'ID du produit et note requis' 
      });
    }

    if (note < 0 || note > 5) {
      return res.status(400).json({ 
        message: 'La note doit être comprise entre 0 et 5' 
      });
    }

    // Vérifier que le produit existe et est actif
    const produit = await Produit.findOne({ 
      _id: produitId, 
      actif: true 
    });

    if (!produit) {
      return res.status(404).json({ 
        message: 'Produit non trouvé ou indisponible' 
      });
    }

    // Vérifier si l'utilisateur a déjà noté ce produit
    let avisExistant = await Avis.findOne({
      utilisateur: utilisateurId,
      cible_type: 'PRODUIT',
      cible_id: produitId
    });

    let message = '';
    let nouvelleNote = note;

    if (avisExistant) {
      // Mise à jour de la note existante
      avisExistant.note = note;
      await avisExistant.save();
      message = 'Note mise à jour avec succès';
    } else {
      // Création d'un nouvel avis (juste avec la note)
      const nouvelAvis = new Avis({
        utilisateur: utilisateurId,
        cible_type: 'PRODUIT',
        cible_id: produitId,
        note: note
      });
      await nouvelAvis.save();
      message = 'Note ajoutée avec succès';
    }

    // Recalculer la note moyenne du produit
    await calculerNoteMoyenneProduit(produitId);

    // Récupérer les statistiques mises à jour
    const stats = await getStatsProduit(produitId);

    res.status(201).json({
      message,
      note: note,
      statistiques: stats
    });

  } catch (error) {
    console.error('Erreur noterProduit:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la notation du produit' 
    });
  }
};

// @desc    Noter une boutique
// @route   POST /api/notes/boutique
const noterBoutique = async (req, res) => {
  try {
    const { boutiqueId, note } = req.body;
    const utilisateurId = req.user._id;

    // Validation
    if (!boutiqueId || note === undefined) {
      return res.status(400).json({ 
        message: 'ID de la boutique et note requis' 
      });
    }

    if (note < 0 || note > 5) {
      return res.status(400).json({ 
        message: 'La note doit être comprise entre 0 et 5' 
      });
    }

    // Vérifier que la boutique existe et est active
    const boutique = await Boutique.findOne({ 
      _id: boutiqueId, 
      active: true 
    });

    if (!boutique) {
      return res.status(404).json({ 
        message: 'Boutique non trouvée ou inactive' 
      });
    }

    // Vérifier si l'utilisateur a déjà noté cette boutique
    let avisExistant = await Avis.findOne({
      utilisateur: utilisateurId,
      cible_type: 'BOUTIQUE',
      cible_id: boutiqueId
    });

    let message = '';

    if (avisExistant) {
      // Mise à jour de la note existante
      avisExistant.note = note;
      await avisExistant.save();
      message = 'Note mise à jour avec succès';
    } else {
      // Création d'un nouvel avis (juste avec la note)
      const nouvelAvis = new Avis({
        utilisateur: utilisateurId,
        cible_type: 'BOUTIQUE',
        cible_id: boutiqueId,
        note: note
      });
      await nouvelAvis.save();
      message = 'Note ajoutée avec succès';
    }

    // Recalculer la note moyenne de la boutique
    await calculerNoteMoyenneBoutique(boutiqueId);

    // Récupérer les statistiques mises à jour
    const stats = await getStatsBoutique(boutiqueId);

    res.status(201).json({
      message,
      note: note,
      statistiques: stats
    });

  } catch (error) {
    console.error('Erreur noterBoutique:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la notation de la boutique' 
    });
  }
};

// @desc    Supprimer sa note (uniquement la note)
// @route   DELETE /api/notes/:id
const supprimerNote = async (req, res) => {
  try {
    const { id } = req.params;
    const utilisateurId = req.user._id;

    const avis = await Avis.findOne({
      _id: id,
      utilisateur: utilisateurId
    });

    if (!avis) {
      return res.status(404).json({ 
        message: 'Note non trouvée' 
      });
    }

    const cibleType = avis.cible_type;
    const cibleId = avis.cible_id;

    await avis.deleteOne();

    // Recalculer la note moyenne
    if (cibleType === 'PRODUIT') {
      await calculerNoteMoyenneProduit(cibleId);
    } else {
      await calculerNoteMoyenneBoutique(cibleId);
    }

    res.json({
      message: 'Note supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur supprimerNote:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression de la note' 
    });
  }
};

// @desc    Obtenir ma note pour un produit/boutique
// @route   GET /api/notes/ma-note
const getMaNote = async (req, res) => {
  try {
    const { cible_type, cible_id } = req.query;
    const utilisateurId = req.user._id;

    if (!cible_type || !cible_id) {
      return res.status(400).json({ 
        message: 'Type et ID de la cible requis' 
      });
    }

    if (!['PRODUIT', 'BOUTIQUE'].includes(cible_type)) {
      return res.status(400).json({ 
        message: 'Type de cible invalide' 
      });
    }

    const avis = await Avis.findOne({
      utilisateur: utilisateurId,
      cible_type,
      cible_id
    });

    res.json({
      a_note: !!avis,
      note: avis ? avis.note : null,
      avis_id: avis ? avis._id : null
    });

  } catch (error) {
    console.error('Erreur getMaNote:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération de votre note' 
    });
  }
};

// Fonctions utilitaires

async function calculerNoteMoyenneProduit(produitId) {
  const result = await Avis.aggregate([
    {
      $match: {
        cible_type: 'PRODUIT',
        cible_id: new mongoose.Types.ObjectId(produitId)
      }
    },
    {
      $group: {
        _id: null,
        moyenne: { $avg: '$note' }
      }
    }
  ]);

  const noteMoyenne = result.length > 0 
    ? Math.round(result[0].moyenne * 10) / 10 
    : 0;

  await Produit.findByIdAndUpdate(produitId, {
    note_moyenne: noteMoyenne
  });

  return noteMoyenne;
}

async function calculerNoteMoyenneBoutique(boutiqueId) {
  const result = await Avis.aggregate([
    {
      $match: {
        cible_type: 'BOUTIQUE',
        cible_id: new mongoose.Types.ObjectId(boutiqueId)
      }
    },
    {
      $group: {
        _id: null,
        moyenne: { $avg: '$note' }
      }
    }
  ]);

  const noteMoyenne = result.length > 0 
    ? Math.round(result[0].moyenne * 10) / 10 
    : 0;

  await Boutique.findByIdAndUpdate(boutiqueId, {
    note_moyenne: noteMoyenne
  });

  return noteMoyenne;
}

async function getStatsProduit(produitId) {
  const stats = await Avis.aggregate([
    {
      $match: {
        cible_type: 'PRODUIT',
        cible_id: new mongoose.Types.ObjectId(produitId)
      }
    },
    {
      $group: {
        _id: null,
        moyenne: { $avg: '$note' },
        total: { $sum: 1 },
        notes: { $push: '$note' }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      moyenne: 0,
      total: 0,
      repartition: []
    };
  }

  const repartition = [1, 2, 3, 4, 5].map(note => ({
    note,
    count: stats[0].notes.filter(n => Math.floor(n) === note).length,
    pourcentage: Math.round((stats[0].notes.filter(n => Math.floor(n) === note).length / stats[0].total) * 100) || 0
  }));

  return {
    moyenne: Math.round(stats[0].moyenne * 10) / 10,
    total: stats[0].total,
    repartition
  };
}

async function getStatsBoutique(boutiqueId) {
  return getStatsProduit(boutiqueId); // Même logique
}

module.exports = {
  noterProduit,
  noterBoutique,
  supprimerNote,
  getMaNote
};