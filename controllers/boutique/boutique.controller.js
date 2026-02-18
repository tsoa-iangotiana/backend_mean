const Boutique = require('../../models/boutique.model');
const Box = require('../../models/box.model');
const User = require('../../models/user.model');
const Categorie = require('../../models/categorie.model');
const mongoose = require('mongoose');

/**
 * @desc    Créer une nouvelle boutique
 * @route   POST /boutique/insert
 * @access  Private (Admin ou responsable)
 */
const createBoutique = async (req, res) => {
  try {
    const { 
      profil_photo, 
      slogan, 
      condition_vente, 
      contact, 
      nom, 
      description, 
      box, 
      responsable, 
      active, 
      categories 
    } = req.body;

    // Validation des champs requis
    if (!nom) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de la boutique est requis'
      });
    }

    if (!responsable) {
      return res.status(400).json({
        success: false,
        message: 'Le responsable est requis'
      });
    }

    // Vérifier si le responsable existe
    const responsableExist = await User.findById(responsable);
    if (!responsableExist) {
      return res.status(404).json({
        success: false,
        message: 'Responsable non trouvé'
      });
    }

    // VÉRIFICATION CRITIQUE: Si le responsable a déjà une boutique
    const boutiqueExistante = await Boutique.findOne({ responsable });
    if (boutiqueExistante) {
      return res.status(400).json({
        success: false,
        message: 'Ce responsable a déjà une boutique. Un responsable ne peut avoir qu\'une seule boutique.',
        boutiqueExistante: {
          id: boutiqueExistante._id,
          nom: boutiqueExistante.nom,
          active: boutiqueExistante.active
        }
      });
    }

    // Vérifier si le box existe et est libre (si un box est spécifié)
    if (box) {
      const boxExist = await Box.findById(box);
      if (!boxExist) {
        return res.status(404).json({
          success: false,
          message: 'Box non trouvé'
        });
      }

      if (!boxExist.libre) {
        return res.status(400).json({
          success: false,
          message: 'Ce box n\'est pas disponible'
        });
      }
    }

    // Vérifier que les catégories existent (si spécifiées)
    if (categories && categories.length > 0) {
      const categoriesExist = await Categorie.find({ 
        '_id': { $in: categories },
        valide: true 
      });
      
      if (categoriesExist.length !== categories.length) {
        return res.status(400).json({
          success: false,
          message: 'Certaines catégories n\'existent pas ou ne sont pas valides'
        });
      }
    }

    // Créer la boutique
    const boutique = new Boutique({
      profil_photo,
      slogan,
      condition_vente,
      contact: contact || [],
      nom,
      description,
      box,
      responsable,
      active: active !== undefined ? active : true,
      categories: categories || [],
      note_moyenne: 0
    });

    await boutique.save();

    // Si un box est assigné, le marquer comme non libre
    if (box) {
      await Box.findByIdAndUpdate(box, { libre: false });
    }

    // Peupler les références pour la réponse
    const populatedBoutique = await Boutique.findById(boutique._id)
      .populate('box', 'numero surface prix_loyer')
      .populate('responsable', 'nom email prenom')
      .populate('categories', 'nom valide');

    res.status(201).json({
      success: true,
      message: 'Boutique créée avec succès',
      boutique: populatedBoutique
    });

  } catch (error) {
    console.error('❌ Erreur createBoutique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la boutique',
      error: error.message
    });
  }
};

/**
 * @desc    Récupérer toutes les boutiques
 * @route   GET /boutique/all
 * @access  Public
 */
const getAllBoutiques = async (req, res) => {
  try {
    const { active, page = 1, limit = 10, search } = req.query;
    
    let query = {};
    
    // Filtrer par statut actif
    if (active !== undefined) {
      query.active = active === 'true';
    }
    
    // Recherche par nom
    if (search) {
      query.nom = { $regex: search, $options: 'i' };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'box', select: 'numero surface prix_loyer libre' },
        { path: 'responsable', select: 'nom email prenom' },
        { path: 'categories', select: 'nom valide' }
      ],
      sort: { createdAt: -1 }
    };

    const boutiques = await Boutique.paginate ? 
      await Boutique.paginate(query, options) : 
      await Boutique.find(query)
        .populate('box', 'numero surface prix_loyer libre')
        .populate('responsable', 'nom email prenom')
        .populate('categories', 'nom valide')
        .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: boutiques.docs ? boutiques.docs.length : boutiques.length,
      boutiques: boutiques.docs || boutiques,
      ...(boutiques.docs && {
        totalPages: boutiques.totalPages,
        currentPage: boutiques.page,
        totalBoutiques: boutiques.totalDocs
      })
    });

  } catch (error) {
    console.error('❌ Erreur getAllBoutiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des boutiques'
    });
  }
};

/**
 * @desc    Récupérer une boutique par ID
 * @route   GET /boutique/:id
 * @access  Public
 */
const getBoutiqueById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boutique invalide'
      });
    }

    const boutique = await Boutique.findById(id)
      .populate('box', 'numero surface prix_loyer libre')
      .populate('responsable', 'nom email prenom telephone')
      .populate('categories', 'nom valide');

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      boutique
    });

  } catch (error) {
    console.error('❌ Erreur getBoutiqueById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la boutique'
    });
  }
};

/**
 * @desc    Récupérer la boutique d'un responsable
 * @route   GET /boutique/responsable/:responsableId
 * @access  Public
 */
const getBoutiqueByResponsable = async (req, res) => {
  try {
    const { responsableId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(responsableId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de responsable invalide'
      });
    }

    const boutique = await Boutique.findOne({ responsable: responsableId })
      .populate('box', 'numero surface prix_loyer libre')
      .populate('responsable', 'nom email prenom')
      .populate('categories', 'nom valide');

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Aucune boutique trouvée pour ce responsable'
      });
    }

    res.status(200).json({
      success: true,
      boutique
    });

  } catch (error) {
    console.error('❌ Erreur getBoutiqueByResponsable:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la boutique du responsable'
    });
  }
};

/**
 * @desc    Mettre à jour une boutique
 * @route   PUT /boutique/:id
 * @access  Private (Admin ou responsable de la boutique)
 */
const updateBoutique = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boutique invalide'
      });
    }

    // Vérifier si la boutique existe
    const boutique = await Boutique.findById(id);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    // Si on change le responsable, vérifier que le nouveau n'a pas déjà une boutique
    if (updates.responsable && updates.responsable.toString() !== boutique.responsable?.toString()) {
      const autreBoutique = await Boutique.findOne({ 
        responsable: updates.responsable,
        _id: { $ne: id }
      });
      
      if (autreBoutique) {
        return res.status(400).json({
          success: false,
          message: 'Ce responsable a déjà une autre boutique'
        });
      }
    }

    // Si on change de box
    if (updates.box && updates.box.toString() !== boutique.box?.toString()) {
      // Libérer l'ancien box
      if (boutique.box) {
        await Box.findByIdAndUpdate(boutique.box, { libre: true });
      }
      
      // Vérifier et réserver le nouveau box
      const nouveauBox = await Box.findById(updates.box);
      if (!nouveauBox) {
        return res.status(404).json({
          success: false,
          message: 'Nouveau box non trouvé'
        });
      }
      
      if (!nouveauBox.libre) {
        return res.status(400).json({
          success: false,
          message: 'Le nouveau box n\'est pas disponible'
        });
      }
      
      await Box.findByIdAndUpdate(updates.box, { libre: false });
    }

    // Si on enlève le box
    if (updates.box === null && boutique.box) {
      await Box.findByIdAndUpdate(boutique.box, { libre: true });
    }

    // Mise à jour des catégories si nécessaire
    if (updates.categories && updates.categories.length > 0) {
      const categoriesExist = await Categorie.find({ 
        '_id': { $in: updates.categories },
        valide: true 
      });
      
      if (categoriesExist.length !== updates.categories.length) {
        return res.status(400).json({
          success: false,
          message: 'Certaines catégories n\'existent pas ou ne sont pas valides'
        });
      }
    }

    // Mettre à jour la boutique
    const boutiqueMaj = await Boutique.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
    .populate('box', 'numero surface prix_loyer libre')
    .populate('responsable', 'nom email prenom')
    .populate('categories', 'nom valide');

    res.status(200).json({
      success: true,
      message: 'Boutique mise à jour avec succès',
      boutique: boutiqueMaj
    });

  } catch (error) {
    console.error('❌ Erreur updateBoutique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la boutique'
    });
  }
};

/**
 * @desc    Supprimer une boutique (soft delete ou hard delete)
 * @route   DELETE /boutique/:id
 * @access  Private (Admin seulement)
 */
const deleteBoutique = async (req, res) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boutique invalide'
      });
    }

    const boutique = await Boutique.findById(id);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    // Libérer le box si la boutique en avait un
    if (boutique.box) {
      await Box.findByIdAndUpdate(boutique.box, { libre: true });
    }

    if (hardDelete === 'true') {
      // Suppression définitive
      await Boutique.findByIdAndDelete(id);
      res.status(200).json({
        success: true,
        message: 'Boutique supprimée définitivement'
      });
    } else {
      // Soft delete - on désactive simplement
      await Boutique.findByIdAndUpdate(id, { active: false });
      res.status(200).json({
        success: true,
        message: 'Boutique désactivée avec succès'
      });
    }

  } catch (error) {
    console.error('❌ Erreur deleteBoutique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la boutique'
    });
  }
};

/**
 * @desc    Activer/Désactiver une boutique
 * @route   PATCH /boutique/:id/toggle
 * @access  Private (Admin)
 */
const toggleBoutiqueActive = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boutique invalide'
      });
    }

    const boutique = await Boutique.findById(id);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    boutique.active = !boutique.active;
    await boutique.save();

    // Si on désactive, on libère le box? (optionnel selon votre logique métier)
    if (!boutique.active && boutique.box) {
      // await Box.findByIdAndUpdate(boutique.box, { libre: true });
    }

    res.status(200).json({
      success: true,
      message: `Boutique ${boutique.active ? 'activée' : 'désactivée'} avec succès`,
      active: boutique.active
    });

  } catch (error) {
    console.error('❌ Erreur toggleBoutiqueActive:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de statut'
    });
  }
};

/**
 * @desc    Ajouter une catégorie à une boutique
 * @route   POST /boutique/:id/categories
 * @access  Private (Admin ou responsable)
 */
const addCategorieToBoutique = async (req, res) => {
  try {
    const { id } = req.params;
    const { categorieId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(categorieId)) {
      return res.status(400).json({
        success: false,
        message: 'ID invalide'
      });
    }

    // Vérifier si la catégorie existe et est valide
    const categorie = await Categorie.findById(categorieId);
    if (!categorie) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }

    if (!categorie.valide) {
      return res.status(400).json({
        success: false,
        message: 'Cette catégorie n\'est pas valide'
      });
    }

    const boutique = await Boutique.findByIdAndUpdate(
      id,
      { $addToSet: { categories: categorieId } },
      { new: true }
    ).populate('categories', 'nom valide');

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Catégorie ajoutée à la boutique',
      categories: boutique.categories
    });

  } catch (error) {
    console.error('❌ Erreur addCategorieToBoutique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout de la catégorie'
    });
  }
};

/**
 * @desc    Retirer une catégorie d'une boutique
 * @route   DELETE /boutique/:id/categories/:categorieId
 * @access  Private (Admin ou responsable)
 */
const removeCategorieFromBoutique = async (req, res) => {
  try {
    const { id, categorieId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(categorieId)) {
      return res.status(400).json({
        success: false,
        message: 'ID invalide'
      });
    }

    const boutique = await Boutique.findByIdAndUpdate(
      id,
      { $pull: { categories: categorieId } },
      { new: true }
    ).populate('categories', 'nom valide');

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Catégorie retirée de la boutique',
      categories: boutique.categories
    });

  } catch (error) {
    console.error('❌ Erreur removeCategorieFromBoutique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du retrait de la catégorie'
    });
  }
};

/**
 * @desc    Ajouter un contact à la boutique
 * @route   POST /boutique/:id/contacts
 * @access  Private (Admin ou responsable)
 */
const addContactToBoutique = async (req, res) => {
  try {
    const { id } = req.params;
    const { contact } = req.body;

    if (!contact) {
      return res.status(400).json({
        success: false,
        message: 'Le contact est requis'
      });
    }

    const boutique = await Boutique.findByIdAndUpdate(
      id,
      { $push: { contact: contact } },
      { new: true }
    );

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact ajouté',
      contacts: boutique.contact
    });

  } catch (error) {
    console.error('❌ Erreur addContactToBoutique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du contact'
    });
  }
};

/**
 * @desc    Supprimer un contact de la boutique
 * @route   DELETE /boutique/:id/contacts/:index
 * @access  Private (Admin ou responsable)
 */
const removeContactFromBoutique = async (req, res) => {
  try {
    const { id, index } = req.params;

    const boutique = await Boutique.findById(id);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    // Vérifier si l'index est valide
    if (index < 0 || index >= boutique.contact.length) {
      return res.status(400).json({
        success: false,
        message: 'Index de contact invalide'
      });
    }

    // Supprimer le contact à l'index spécifié
    boutique.contact.splice(index, 1);
    await boutique.save();

    res.status(200).json({
      success: true,
      message: 'Contact supprimé',
      contacts: boutique.contact
    });

  } catch (error) {
    console.error('❌ Erreur removeContactFromBoutique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du contact'
    });
  }
};

/**
 * @desc    Vérifier si un responsable a déjà une boutique
 * @route   GET /boutique/check-responsable/:responsableId
 * @access  Public
 */
const checkResponsableBoutique = async (req, res) => {
  try {
    const { responsableId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(responsableId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de responsable invalide'
      });
    }

    const boutique = await Boutique.findOne({ responsable: responsableId })
      .populate('box', 'numero surface prix_loyer')
      .populate('categories', 'nom');

    res.status(200).json({
      success: true,
      hasBoutique: !!boutique,
      boutique: boutique || null
    });

  } catch (error) {
    console.error('❌ Erreur checkResponsableBoutique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification'
    });
  }
};

module.exports = {
  createBoutique,
  getAllBoutiques,
  getBoutiqueById,
  getBoutiqueByResponsable,
  updateBoutique,
  deleteBoutique,
  toggleBoutiqueActive,
  addCategorieToBoutique,
  removeCategorieFromBoutique,
  addContactToBoutique,
  removeContactFromBoutique,
  checkResponsableBoutique
};