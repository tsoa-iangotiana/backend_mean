const Avis = require('../../models/avis.model');
const Produit = require('../../models/produit.model');
const Boutique = require('../../models/boutique.model');
const mongoose = require('mongoose');

// @desc    Donner un avis complet (note + commentaire) sur un produit
const donnerAvisProduit = async (req, res) => {
  try {
    const { produitId, note, commentaire } = req.body;
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

    if (commentaire && commentaire.length > 1000) {
      return res.status(400).json({ 
        message: 'Le commentaire ne peut pas dépasser 1000 caractères' 
      });
    }

    // Vérifier que le produit existe
    const produit = await Produit.findOne({ 
      _id: produitId, 
      actif: true 
    }).populate('boutique', 'nom');

    if (!produit) {
      return res.status(404).json({ 
        message: 'Produit non trouvé ou indisponible' 
      });
    }

    // Vérifier si l'utilisateur a déjà donné un avis
    let avisExistant = await Avis.findOne({
      utilisateur: utilisateurId,
      cible_type: 'PRODUIT',
      cible_id: produitId
    });

    let message = '';

    if (avisExistant) {
      // Mise à jour
      avisExistant.note = note;
      avisExistant.commentaire = commentaire || avisExistant.commentaire;
      await avisExistant.save();
      message = 'Avis mis à jour avec succès';
    } else {
      // Création
      const nouvelAvis = new Avis({
        utilisateur: utilisateurId,
        cible_type: 'PRODUIT',
        cible_id: produitId,
        note,
        commentaire: commentaire || ''
      });
      await nouvelAvis.save();
      message = 'Avis ajouté avec succès';
    }

    // Mettre à jour la note moyenne du produit
    await calculerNoteMoyenneProduit(produitId);

    // Récupérer les avis mis à jour
    const avis = await getAvisProduit(produitId, 1, 10);

    res.status(201).json({
      message,
      produit: {
        id: produit._id,
        nom: produit.nom,
        boutique: produit.boutique.nom
      },
      avis: avis.avis,
      statistiques: avis.statistiques
    });

  } catch (error) {
    console.error('Erreur donnerAvisProduit:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'ajout de l\'avis' 
    });
  }
};

// @desc    Donner un avis complet (note + commentaire) sur une boutique
// @route   POST /api/avis/boutique
const donnerAvisBoutique = async (req, res) => {
  try {
    const { boutiqueId, note, commentaire } = req.body;
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

    if (commentaire && commentaire.length > 1000) {
      return res.status(400).json({ 
        message: 'Le commentaire ne peut pas dépasser 1000 caractères' 
      });
    }

    // Vérifier que la boutique existe
    const boutique = await Boutique.findOne({ 
      _id: boutiqueId, 
      active: true 
    });

    if (!boutique) {
      return res.status(404).json({ 
        message: 'Boutique non trouvée ou inactive' 
      });
    }

    // Vérifier si l'utilisateur a déjà donné un avis
    let avisExistant = await Avis.findOne({
      utilisateur: utilisateurId,
      cible_type: 'BOUTIQUE',
      cible_id: boutiqueId
    });

    let message = '';

    if (avisExistant) {
      // Mise à jour
      avisExistant.note = note;
      avisExistant.commentaire = commentaire || avisExistant.commentaire;
      await avisExistant.save();
      message = 'Avis mis à jour avec succès';
    } else {
      // Création
      const nouvelAvis = new Avis({
        utilisateur: utilisateurId,
        cible_type: 'BOUTIQUE',
        cible_id: boutiqueId,
        note,
        commentaire: commentaire || ''
      });
      await nouvelAvis.save();
      message = 'Avis ajouté avec succès';
    }

    // Mettre à jour la note moyenne de la boutique
    await calculerNoteMoyenneBoutique(boutiqueId);

    // Récupérer les avis mis à jour
    const avis = await getAvisBoutique(boutiqueId, 1, 10);

    res.status(201).json({
      message,
      boutique: {
        id: boutique._id,
        nom: boutique.nom
      },
      avis: avis.avis,
      statistiques: avis.statistiques
    });

  } catch (error) {
    console.error('Erreur donnerAvisBoutique:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'ajout de l\'avis' 
    });
  }
};

// @desc    Récupérer les avis d'un produit avec pagination
// @route   GET /api/avis/produit/:produitId
const getAvisProduit = async (req, res) => {
  try {
    const { produitId } = req.params;
    const { page = 1, limit = 10, tri = 'recent' } = req.query;

    // Vérifier que le produit existe
    const produit = await Produit.findById(produitId);
    if (!produit) {
      return res.status(404).json({ 
        message: 'Produit non trouvé' 
      });
    }

    const result = await getAvisWithPagination(
      'PRODUIT', 
      produitId, 
      parseInt(page), 
      parseInt(limit),
      tri
    );

    res.json({
      produit: {
        id: produit._id,
        nom: produit.nom,
        note_moyenne: produit.note_moyenne
      },
      ...result
    });

  } catch (error) {
    console.error('Erreur getAvisProduit:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des avis' 
    });
  }
};

// @desc    Récupérer les avis d'une boutique avec pagination
// @route   GET /api/avis/boutique/:boutiqueId
const getAvisBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const { page = 1, limit = 10, tri = 'recent' } = req.query;

    // Vérifier que la boutique existe
    const boutique = await Boutique.findById(boutiqueId);
    if (!boutique) {
      return res.status(404).json({ 
        message: 'Boutique non trouvée' 
      });
    }

    const result = await getAvisWithPagination(
      'BOUTIQUE', 
      boutiqueId, 
      parseInt(page), 
      parseInt(limit),
      tri
    );

    res.json({
      boutique: {
        id: boutique._id,
        nom: boutique.nom,
        note_moyenne: boutique.note_moyenne
      },
      ...result
    });

  } catch (error) {
    console.error('Erreur getAvisBoutique:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des avis' 
    });
  }
};

// @desc    Modifier son avis
// @route   PUT /api/avis/:id
const modifierAvis = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, commentaire } = req.body;
    const utilisateurId = req.user._id;

    const avis = await Avis.findOne({
      _id: id,
      utilisateur: utilisateurId
    });

    if (!avis) {
      return res.status(404).json({ 
        message: 'Avis non trouvé' 
      });
    }

    if (note !== undefined) {
      if (note < 0 || note > 5) {
        return res.status(400).json({ 
          message: 'La note doit être comprise entre 0 et 5' 
        });
      }
      avis.note = note;
    }

    if (commentaire !== undefined) {
      if (commentaire.length > 1000) {
        return res.status(400).json({ 
          message: 'Le commentaire ne peut pas dépasser 1000 caractères' 
        });
      }
      avis.commentaire = commentaire;
    }

    await avis.save();

    // Recalculer la note moyenne
    if (avis.cible_type === 'PRODUIT') {
      await calculerNoteMoyenneProduit(avis.cible_id);
    } else {
      await calculerNoteMoyenneBoutique(avis.cible_id);
    }

    res.json({
      message: 'Avis modifié avec succès',
      avis: {
        id: avis._id,
        note: avis.note,
        commentaire: avis.commentaire,
        date_modification: avis.updatedAt
      }
    });

  } catch (error) {
    console.error('Erreur modifierAvis:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la modification de l\'avis' 
    });
  }
};

// @desc    Supprimer son avis
// @route   DELETE /api/avis/:id
const supprimerAvis = async (req, res) => {
  try {
    const { id } = req.params;
    const utilisateurId = req.user._id;

    const avis = await Avis.findOne({
      _id: id,
      utilisateur: utilisateurId
    });

    if (!avis) {
      return res.status(404).json({ 
        message: 'Avis non trouvé' 
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
      message: 'Avis supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur supprimerAvis:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression de l\'avis' 
    });
  }
};

// @desc    Signaler un avis inapproprié
// @route   POST /api/avis/:id/signaler
const signalerAvis = async (req, res) => {
  try {
    const { id } = req.params;
    const { raison } = req.body;

    const avis = await Avis.findById(id);

    if (!avis) {
      return res.status(404).json({ 
        message: 'Avis non trouvé' 
      });
    }

    // Logique de signalement à implémenter
    // Par exemple, créer une collection "Signalements"
    
    res.json({
      message: 'Avis signalé, merci pour votre contribution'
    });

  } catch (error) {
    console.error('Erreur signalerAvis:', error);
    res.status(500).json({ 
      message: 'Erreur lors du signalement' 
    });
  }
};

// Fonctions utilitaires

async function getAvisWithPagination(cibleType, cibleId, page, limit, tri) {
  const skip = (page - 1) * limit;

  // Configuration du tri
  let sort = {};
  switch (tri) {
    case 'recent':
      sort = { createdAt: -1 };
      break;
    case 'ancien':
      sort = { createdAt: 1 };
      break;
    case 'note_desc':
      sort = { note: -1, createdAt: -1 };
      break;
    case 'note_asc':
      sort = { note: 1, createdAt: -1 };
      break;
    case 'utile':
      // À implémenter avec un système de votes
      sort = { createdAt: -1 };
      break;
    default:
      sort = { createdAt: -1 };
  }

  // Récupérer les avis
  const avis = await Avis.find({
    cible_type: cibleType,
    cible_id: cibleId
  })
    .populate('utilisateur', 'nom email avatar')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  // Formater les avis
  const avisFormates = avis.map(a => ({
    id: a._id,
    utilisateur: {
      id: a.utilisateur._id,
      nom: a.utilisateur.nom,
      avatar: a.utilisateur.avatar || null
    },
    note: a.note,
    commentaire: a.commentaire,
    date: a.createdAt,
    date_formatee: formatDate(a.createdAt),
    utile: a.utile || 0, // À implémenter
    deja_utile: false // À implémenter
  }));

  // Statistiques
  const stats = await Avis.aggregate([
    {
      $match: {
        cible_type: cibleType,
        cible_id: new mongoose.Types.ObjectId(cibleId)
      }
    },
    {
      $group: {
        _id: null,
        moyenne: { $avg: '$note' },
        total: { $sum: 1 },
        notes: { $push: '$note' },
        avec_commentaire: {
          $sum: {
            $cond: [{ $ne: ['$commentaire', ''] }, 1, 0]
          }
        }
      }
    }
  ]);

  const total = await Avis.countDocuments({
    cible_type: cibleType,
    cible_id: cibleId
  });

  let statistiques = {
    moyenne: 0,
    total: 0,
    avec_commentaire: 0,
    repartition: []
  };

  if (stats.length > 0) {
    const repartition = [5, 4, 3, 2, 1].map(note => ({
      note,
      count: stats[0].notes.filter(n => Math.floor(n) === note).length,
      pourcentage: Math.round((stats[0].notes.filter(n => Math.floor(n) === note).length / stats[0].total) * 100) || 0
    }));

    statistiques = {
      moyenne: Math.round(stats[0].moyenne * 10) / 10,
      total: stats[0].total,
      avec_commentaire: stats[0].avec_commentaire,
      repartition
    };
  }

  return {
    avis: avisFormates,
    statistiques,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    tri_actuel: tri
  };
}

function formatDate(date) {
  const maintenant = new Date();
  const diff = maintenant - new Date(date);
  const secondes = Math.floor(diff / 1000);
  const minutes = Math.floor(secondes / 60);
  const heures = Math.floor(minutes / 60);
  const jours = Math.floor(heures / 24);

  if (jours > 30) {
    return new Date(date).toLocaleDateString('fr-FR');
  } else if (jours > 0) {
    return `Il y a ${jours} jour${jours > 1 ? 's' : ''}`;
  } else if (heures > 0) {
    return `Il y a ${heures} heure${heures > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `À l'instant`;
  }
}

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

module.exports = {
  donnerAvisProduit,
  donnerAvisBoutique,
  getAvisProduit,
  getAvisBoutique,
  modifierAvis,
  supprimerAvis,
  signalerAvis
};