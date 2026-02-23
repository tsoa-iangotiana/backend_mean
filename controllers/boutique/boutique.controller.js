const Boutique = require('../../models/boutique.model');
const Box = require('../../models/box.model');
const User = require('../../models/user.model');
const Categorie = require('../../models/categorie.model');
const mongoose = require('mongoose');
const cloudinary = require('../../config/cloudinary');


/**
 * @desc    Créer une nouvelle boutique
 * @route   POST /boutique/insert
 * @access  Private (Admin ou responsable)
 */
const createBoutique = async (req, res) => {
  try {
    const {  
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

    // 🔥 NORMALISATION DES TABLEAUX (IMPORTANT)
    const categoriesArray = categories
      ? (Array.isArray(categories) ? categories : [categories])
      : [];

    const contactArray = contact
      ? (Array.isArray(contact) ? contact : [contact])
      : [];

    // ============================
    // VALIDATIONS
    // ============================

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

    // Vérifier si le box existe et est libre
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

    // Vérifier les catégories
    if (categoriesArray.length > 0) {
      const categoriesExist = await Categorie.find({ 
        _id: { $in: categoriesArray },
        valide: true 
      });

      if (categoriesExist.length !== categoriesArray.length) {
        return res.status(400).json({
          success: false,
          message: 'Certaines catégories n\'existent pas ou ne sont pas valides'
        });
      }
    }

    // ============================
    // UPLOAD CLOUDINARY
    // ============================

    let profil_photo = null;
    let cloudinary_id = null;

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'boutiques',
            transformation: [
              { width: 500, height: 500, crop: 'fill' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });

      profil_photo = result.secure_url;
      cloudinary_id = result.public_id;
    }

    // ============================
    // CREATION BOUTIQUE
    // ============================

    const boutique = new Boutique({
      profil_photo,
      cloudinary_id,
      slogan,
      condition_vente,
      contact: contactArray,
      nom,
      description,
      box,
      responsable,
      active: active !== undefined ? active : true,
      categories: categoriesArray,
      note_moyenne: 0
    });

    await boutique.save();

    // Si un box est assigné → le bloquer
    if (box) {
      await Box.findByIdAndUpdate(box, { libre: false });
    }

    // Populate
    const populatedBoutique = await Boutique.findById(boutique._id)
      .populate('box', 'numero surface prix_loyer')
      .populate('responsable', 'nom email prenom')
      .populate('categories', 'nom valide');

    return res.status(201).json({
      success: true,
      message: 'Boutique créée avec succès',
      boutique: populatedBoutique
    });

  } catch (error) {
    console.error('❌ Erreur createBoutique:', error);
    return res.status(500).json({
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

    const boutique = await Boutique.find({ responsable: responsableId })
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

    // ===============================
    // 🔁 NORMALISATION DES TABLEAUX
    // ===============================
    const categoriesArray = req.body.categories
      ? (Array.isArray(req.body.categories)
          ? req.body.categories
          : [req.body.categories])
      : boutique.categories;

    const contactArray = req.body.contact
      ? (Array.isArray(req.body.contact)
          ? req.body.contact
          : [req.body.contact])
      : boutique.contact;

    // ===============================
    // 👤 VERIFICATION RESPONSABLE
    // ===============================
    if (
      req.body.responsable &&
      req.body.responsable.toString() !== boutique.responsable?.toString()
    ) {
      const autreBoutique = await Boutique.findOne({
        responsable: req.body.responsable,
        _id: { $ne: id }
      });

      if (autreBoutique) {
        return res.status(400).json({
          success: false,
          message: 'Ce responsable a déjà une autre boutique'
        });
      }
    }

    // ===============================
    // 📦 GESTION BOX
    // ===============================
    if (
      req.body.box &&
      req.body.box.toString() !== boutique.box?.toString()
    ) {
      // Libérer ancien box
      if (boutique.box) {
        await Box.findByIdAndUpdate(boutique.box, { libre: true });
      }

      // Vérifier nouveau box
      const nouveauBox = await Box.findById(req.body.box);
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

      await Box.findByIdAndUpdate(req.body.box, { libre: false });
    }

    // Si suppression du box
    if (req.body.box === null && boutique.box) {
      await Box.findByIdAndUpdate(boutique.box, { libre: true });
    }

    // ===============================
    // 🏷 VERIFICATION CATEGORIES
    // ===============================
    if (categoriesArray && categoriesArray.length > 0) {
      const categoriesExist = await Categorie.find({
        _id: { $in: categoriesArray },
        valide: true
      });

      if (categoriesExist.length !== categoriesArray.length) {
        return res.status(400).json({
          success: false,
          message: 'Certaines catégories n\'existent pas ou ne sont pas valides'
        });
      }
    }

    // ===============================
    // 🖼 GESTION IMAGE CLOUDINARY
    // ===============================
    let profil_photo = boutique.profil_photo;
    let cloudinary_id = boutique.cloudinary_id;

    if (req.file) {
      // Supprimer ancienne image
      if (cloudinary_id) {
        await cloudinary.uploader.destroy(cloudinary_id);
      }

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'boutiques',
            transformation: [
              { width: 500, height: 500, crop: 'fill' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });

      profil_photo = result.secure_url;
      cloudinary_id = result.public_id;
    }

    // ===============================
    // 🔄 CONSTRUCTION UPDATE SAFE
    // ===============================
    const updates = {
      nom: req.body.nom ?? boutique.nom,
      slogan: req.body.slogan ?? boutique.slogan,
      description: req.body.description ?? boutique.description,
      condition_vente: req.body.condition_vente ?? boutique.condition_vente,
      contact: contactArray,
      categories: categoriesArray,
      profil_photo,
      cloudinary_id,
      responsable: req.body.responsable ?? boutique.responsable,
      box: req.body.box !== undefined ? req.body.box : boutique.box
    };

    // ===============================
    // 💾 UPDATE FINAL
    // ===============================
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