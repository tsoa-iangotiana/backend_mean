const Box = require('../models/box.model');
const Boutique = require('../models/boutique.model');
const BoxHistorique = require('../models/box_historique.model');
const mongoose = require('mongoose');

// @desc    Créer un nouveau box
// @route   POST /api/box
// @access  Private (Admin seulement)
const createBox = async (req, res) => {
  try {
    const { numero, surface, prix_loyer } = req.body;

    // Validation
    if (!numero || !surface || !prix_loyer) {
      return res.status(400).json({
        success: false,
        message: 'Numéro, surface et prix du loyer sont requis'
      });
    }

    // Vérifier si le numéro de box existe déjà
    const boxExistant = await Box.findOne({ numero });
    if (boxExistant) {
      return res.status(400).json({
        success: false,
        message: 'Un box avec ce numéro existe déjà'
      });
    }

    const box = new Box({
      numero,
      surface,
      prix_loyer,
      libre: true // Par défaut, un nouveau box est libre
    });

    await box.save();

    res.status(201).json({
      success: true,
      message: 'Box créé avec succès',
      box
    });

  } catch (error) {
    console.error('❌ Erreur createBox:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du box'
    });
  }
};

// @desc    Attribuer un box à une boutique
// @route   POST /api/box/:boxId/attribuer
// @access  Private (Admin seulement)
const attribuerBox = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { boxId } = req.params;
    const { boutiqueId, date_debut } = req.body;

    // Validation
    if (!boutiqueId) {
      return res.status(400).json({
        success: false,
        message: 'ID de la boutique requis'
      });
    }

    // Vérifier que le box existe
    const box = await Box.findById(boxId).session(session);
    if (!box) {
      return res.status(404).json({
        success: false,
        message: 'Box non trouvé'
      });
    }

    // Vérifier que le box est libre
    if (!box.libre) {
      return res.status(400).json({
        success: false,
        message: 'Ce box est déjà occupé'
      });
    }

    // Vérifier que la boutique existe et n'a pas déjà un box
    const boutique = await Boutique.findById(boutiqueId).session(session);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    // Vérifier si la boutique a déjà un box attribué
    if (boutique.box) {
      return res.status(400).json({
        success: false,
        message: 'Cette boutique a déjà un box attribué'
      });
    }

    // Date de début (par défaut maintenant)
    const debut = date_debut ? new Date(date_debut) : new Date();

    // Créer l'entrée dans l'historique
    const historique = new BoxHistorique({
      box: boxId,
      boutique: boutiqueId,
      date_debut: debut
    });

    await historique.save({ session });

    // Mettre à jour le box (occupé)
    box.libre = false;
    await box.save({ session });

    // Mettre à jour la boutique avec la référence du box
    boutique.box = boxId;
    await boutique.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Box attribué avec succès',
      attribution: {
        box: {
          id: box._id,
          numero: box.numero
        },
        boutique: {
          id: boutique._id,
          nom: boutique.nom
        },
        date_debut: debut,
        historique_id: historique._id
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Erreur attribuerBox:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'attribution du box'
    });
  }
};

// @desc    Libérer un box (fin d'occupation)
// @route   POST /api/box/:boxId/liberer
// @access  Private (Admin seulement)
const libererBox = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { boxId } = req.params;
    const { date_fin } = req.body;

    // Vérifier que le box existe
    const box = await Box.findById(boxId).session(session);
    if (!box) {
      return res.status(404).json({
        success: false,
        message: 'Box non trouvé'
      });
    }

    // Vérifier que le box est occupé
    if (box.libre) {
      return res.status(400).json({
        success: false,
        message: 'Ce box est déjà libre'
      });
    }

    // Trouver la boutique associée
    const boutique = await Boutique.findOne({ box: boxId }).session(session);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Aucune boutique trouvée pour ce box'
      });
    }

    // Trouver l'entrée d'historique active (sans date de fin)
    const historiqueActif = await BoxHistorique.findOne({
      box: boxId,
      boutique: boutique._id,
      date_fin: null
    }).session(session);

    if (!historiqueActif) {
      return res.status(404).json({
        success: false,
        message: 'Historique actif non trouvé'
      });
    }

    // Date de fin (par défaut maintenant)
    const fin = date_fin ? new Date(date_fin) : new Date();

    // Mettre à jour l'historique
    historiqueActif.date_fin = fin;
    await historiqueActif.save({ session });

    // Libérer le box
    box.libre = true;
    await box.save({ session });

    // Retirer la référence du box de la boutique
    boutique.box = null;
    await boutique.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Calculer la durée d'occupation
    const dureeOccupation = Math.ceil((fin - historiqueActif.date_debut) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      message: 'Box libéré avec succès',
      liberation: {
        box: {
          id: box._id,
          numero: box.numero
        },
        boutique: {
          id: boutique._id,
          nom: boutique.nom
        },
        date_debut: historiqueActif.date_debut,
        date_fin: fin,
        duree_occupation: `${dureeOccupation} jour${dureeOccupation > 1 ? 's' : ''}`
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Erreur libererBox:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la libération du box'
    });
  }
};

// @desc    Transférer un box d'une boutique à une autre
// @route   POST /api/box/:boxId/transferer
// @access  Private (Admin seulement)
const transfererBox = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { boxId } = req.params;
    const { nouvelleBoutiqueId, date_transfert } = req.body;

    // Validation
    if (!nouvelleBoutiqueId) {
      return res.status(400).json({
        success: false,
        message: 'ID de la nouvelle boutique requis'
      });
    }

    // Vérifier que le box existe
    const box = await Box.findById(boxId).session(session);
    if (!box) {
      return res.status(404).json({
        success: false,
        message: 'Box non trouvé'
      });
    }

    // Vérifier que le box est occupé
    if (box.libre) {
      return res.status(400).json({
        success: false,
        message: 'Ce box est libre, utilisez attribution plutôt'
      });
    }

    // Trouver l'ancienne boutique
    const ancienneBoutique = await Boutique.findOne({ box: boxId }).session(session);
    if (!ancienneBoutique) {
      return res.status(404).json({
        success: false,
        message: 'Ancienne boutique non trouvée'
      });
    }

    // Vérifier que la nouvelle boutique existe
    const nouvelleBoutique = await Boutique.findById(nouvelleBoutiqueId).session(session);
    if (!nouvelleBoutique) {
      return res.status(404).json({
        success: false,
        message: 'Nouvelle boutique non trouvée'
      });
    }

    // Vérifier que la nouvelle boutique n'a pas déjà un box
    if (nouvelleBoutique.box) {
      return res.status(400).json({
        success: false,
        message: 'La nouvelle boutique a déjà un box attribué'
      });
    }

    // Date de transfert (par défaut maintenant)
    const transfertDate = date_transfert ? new Date(date_transfert) : new Date();

    // Trouver l'historique actif de l'ancienne boutique
    const historiqueAncien = await BoxHistorique.findOne({
      box: boxId,
      boutique: ancienneBoutique._id,
      date_fin: null
    }).session(session);

    if (historiqueAncien) {
      // Clôturer l'ancien historique
      historiqueAncien.date_fin = transfertDate;
      await historiqueAncien.save({ session });
    }

    // Créer le nouvel historique
    const nouvelHistorique = new BoxHistorique({
      box: boxId,
      boutique: nouvelleBoutiqueId,
      date_debut: transfertDate
    });
    await nouvelHistorique.save({ session });

    // Mettre à jour les boutiques
    ancienneBoutique.box = null;
    await ancienneBoutique.save({ session });

    nouvelleBoutique.box = boxId;
    await nouvelleBoutique.save({ session });

    // Le box reste occupé (libre = false inchangé)

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Box transféré avec succès',
      transfert: {
        box: {
          id: box._id,
          numero: box.numero
        },
        ancienne_boutique: {
          id: ancienneBoutique._id,
          nom: ancienneBoutique.nom
        },
        nouvelle_boutique: {
          id: nouvelleBoutique._id,
          nom: nouvelleBoutique.nom
        },
        date_transfert: transfertDate
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Erreur transfererBox:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du transfert du box'
    });
  }
};

// @desc    Obtenir tous les box avec filtres
// @route   GET /api/box
// @access  Private (Admin)
const getAllBox = async (req, res) => {
  try {
    const { 
      libre, 
      search,
      page = 1, 
      limit = 20,
      tri = 'numero_asc'
    } = req.query;

    // Construction du filtre
    const filter = {};
    if (libre !== undefined) {
      filter.libre = libre === 'true';
    }

    if (search) {
      filter.$or = [
        { numero: { $regex: search, $options: 'i' } }
      ];
    }

    // Configuration du tri
    let sort = {};
    switch (tri) {
      case 'numero_asc':
        sort = { numero: 1 };
        break;
      case 'numero_desc':
        sort = { numero: -1 };
        break;
      case 'surface_asc':
        sort = { surface: 1 };
        break;
      case 'surface_desc':
        sort = { surface: -1 };
        break;
      case 'prix_asc':
        sort = { prix_loyer: 1 };
        break;
      case 'prix_desc':
        sort = { prix_loyer: -1 };
        break;
      default:
        sort = { numero: 1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les box
    const boxs = await Box.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Enrichir avec les informations d'occupation actuelles
    const boxsEnrichis = await Promise.all(boxs.map(async (box) => {
      if (!box.libre) {
        // Chercher la boutique occupante
        const boutique = await Boutique.findOne({ box: box._id })
          .select('nom description')
          .lean();

        // Chercher l'historique actif
        const historique = await BoxHistorique.findOne({
          box: box._id,
          date_fin: null
        })
          .populate('boutique', 'nom')
          .lean();

        return {
          ...box,
          occupé_par: boutique || null,
          historique_actif: historique ? {
            depuis: historique.date_debut,
            boutique: historique.boutique
          } : null
        };
      }
      return box;
    }));

    const total = await Box.countDocuments(filter);

    // Statistiques
    const stats = await Box.aggregate([
      {
        $group: {
          _id: null,
          total_box: { $sum: 1 },
          box_libres: {
            $sum: { $cond: ['$libre', 1, 0] }
          },
          box_occupes: {
            $sum: { $cond: ['$libre', 0, 1] }
          },
          loyer_moyen: { $avg: '$prix_loyer' },
          surface_moyenne: { $avg: '$surface' }
        }
      }
    ]);

    res.json({
      success: true,
      boxs: boxsEnrichis,
      statistiques: stats[0] || {
        total_box: 0,
        box_libres: 0,
        box_occupes: 0,
        loyer_moyen: 0,
        surface_moyenne: 0
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filtres_appliques: {
        libre: libre || 'tous',
        search: search || null,
        tri
      }
    });

  } catch (error) {
    console.error('❌ Erreur getAllBox:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des box'
    });
  }
};

// @desc    Obtenir les détails d'un box
// @route   GET /api/box/:boxId
// @access  Private (Admin)
const getBoxById = async (req, res) => {
  try {
    const { boxId } = req.params;

    const box = await Box.findById(boxId).lean();
    if (!box) {
      return res.status(404).json({
        success: false,
        message: 'Box non trouvé'
      });
    }

    // Récupérer l'historique complet
    const historique = await BoxHistorique.find({ box: boxId })
      .populate('boutique', 'nom description')
      .sort('-date_debut')
      .lean();

    // Récupérer l'occupation actuelle si le box est occupé
    let occupationActuelle = null;
    if (!box.libre) {
      const boutique = await Boutique.findOne({ box: boxId })
        .select('nom description responsable')
        .populate('responsable', 'username email')
        .lean();

      const historiqueActif = historique.find(h => !h.date_fin);

      occupationActuelle = {
        boutique,
        depuis: historiqueActif?.date_debut,
        duree: historiqueActif ? 
          Math.ceil((new Date() - historiqueActif.date_debut) / (1000 * 60 * 60 * 24)) : 0
      };
    }

    // Statistiques d'occupation
    const statsOccupation = {
      nombre_occupations: historique.length,
      total_jours_occupes: historique.reduce((acc, h) => {
        if (h.date_fin) {
          return acc + Math.ceil((h.date_fin - h.date_debut) / (1000 * 60 * 60 * 24));
        }
        return acc;
      }, 0),
      premiere_occupation: historique[historique.length - 1]?.date_debut || null,
      derniere_occupation: historique[0]?.date_debut || null
    };

    res.json({
      success: true,
      box: {
        ...box,
        occupation_actuelle: occupationActuelle
      },
      historique,
      statistiques: statsOccupation
    });

  } catch (error) {
    console.error('❌ Erreur getBoxById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du box'
    });
  }
};

// @desc    Mettre à jour un box
// @route   PUT /api/box/:boxId
// @access  Private (Admin)
const updateBox = async (req, res) => {
  try {
    const { boxId } = req.params;
    const { numero, surface, prix_loyer } = req.body;

    // Vérifier que le box existe
    const box = await Box.findById(boxId);
    if (!box) {
      return res.status(404).json({
        success: false,
        message: 'Box non trouvé'
      });
    }

    // Vérifier l'unicité du numéro si modifié
    if (numero && numero !== box.numero) {
      const boxExistant = await Box.findOne({ numero });
      if (boxExistant) {
        return res.status(400).json({
          success: false,
          message: 'Un box avec ce numéro existe déjà'
        });
      }
    }

    // Mise à jour
    if (numero) box.numero = numero;
    if (surface) box.surface = surface;
    if (prix_loyer) box.prix_loyer = prix_loyer;

    await box.save();

    res.json({
      success: true,
      message: 'Box mis à jour avec succès',
      box
    });

  } catch (error) {
    console.error('❌ Erreur updateBox:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du box'
    });
  }
};

// @desc    Supprimer un box (seulement si libre)
// @route   DELETE /api/box/:boxId
// @access  Private (Admin)
const deleteBox = async (req, res) => {
  try {
    const { boxId } = req.params;

    const box = await Box.findById(boxId);
    if (!box) {
      return res.status(404).json({
        success: false,
        message: 'Box non trouvé'
      });
    }

    // Vérifier que le box est libre
    if (!box.libre) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un box occupé'
      });
    }

    // Vérifier s'il y a un historique (on peut choisir de le garder ou non)
    const historiqueExiste = await BoxHistorique.exists({ box: boxId });
    if (historiqueExiste) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un box avec un historique'
      });
    }

    await box.deleteOne();

    res.json({
      success: true,
      message: 'Box supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur deleteBox:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du box'
    });
  }
};

// @desc    Obtenir l'historique d'un box
// @route   GET /api/box/:boxId/historique
// @access  Private (Admin)
const getBoxHistorique = async (req, res) => {
  try {
    const { boxId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const historique = await BoxHistorique.find({ box: boxId })
      .populate('boutique', 'nom')
      .sort('-date_debut')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await BoxHistorique.countDocuments({ box: boxId });

    // Calculer les durées pour chaque entrée
    const historiqueAvecDuree = historique.map(h => ({
      ...h,
      duree_jours: h.date_fin ? 
        Math.ceil((h.date_fin - h.date_debut) / (1000 * 60 * 60 * 24)) : 
        Math.ceil((new Date() - h.date_debut) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      success: true,
      historique: historiqueAvecDuree,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Erreur getBoxHistorique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique'
    });
  }
};

module.exports = {
  createBox,
  attribuerBox,
  libererBox,
  transfererBox,
  getAllBox,
  getBoxById,
  updateBox,
  deleteBox,
  getBoxHistorique
};