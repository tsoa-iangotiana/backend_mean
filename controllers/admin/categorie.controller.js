const Categorie = require('../../models/categorie.model');

/**
 * @desc    Créer une nouvelle catégorie
 * @route   POST /categorie
 * @access  Public
 */
const createCategorie = async (req, res) => {
  try {
    const { nom, valide } = req.body;

    // Validation
    if (!nom) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de la catégorie est requis'
      });
    }

    // Vérifier si la catégorie existe déjà
    const categorieExistante = await Categorie.findOne({ nom });
    if (categorieExistante) {
      return res.status(400).json({
        success: false,
        message: 'Une catégorie avec ce nom existe déjà'
      });
    }

    const categorie = new Categorie({
      nom,
      valide: valide !== undefined ? valide : false
    });

    await categorie.save();

    res.status(201).json({
      success: true,
      message: 'Catégorie créée avec succès',
      categorie
    });

  } catch (error) {
    console.error('❌ Erreur createCategorie:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la catégorie'
    });
  }
};

/**
 * @desc    Récupérer toutes les catégories
 * @route   GET /categorie
 * @access  Public
 */
const getAllCategories = async (req, res) => {
  try {
    const categories = await Categorie.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });

  } catch (error) {
    console.error('❌ Erreur getAllCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories'
    });
  }
};

/**
 * @desc    Récupérer une catégorie par son ID
 * @route   GET /categorie/:id
 * @access  Public
 */
const getCategorieById = async (req, res) => {
  try {
    const categorie = await Categorie.findById(req.params.id);

    if (!categorie) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      categorie
    });

  } catch (error) {
    console.error('❌ Erreur getCategorieById:', error);
    
    // Vérifier si l'erreur est due à un ID invalide
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'ID de catégorie invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la catégorie'
    });
  }
};

/**
 * @desc    Mettre à jour une catégorie
 * @route   PUT /categorie/:id
 * @access  Public
 */
const updateCategorie = async (req, res) => {
  try {
    const { nom, valide } = req.body;

    // Vérifier si la catégorie existe
    let categorie = await Categorie.findById(req.params.id);
    
    if (!categorie) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }

    // Si le nom est modifié, vérifier qu'il n'existe pas déjà
    if (nom && nom !== categorie.nom) {
      const categorieExistante = await Categorie.findOne({ nom });
      if (categorieExistante) {
        return res.status(400).json({
          success: false,
          message: 'Une catégorie avec ce nom existe déjà'
        });
      }
    }

    // Mise à jour
    categorie = await Categorie.findByIdAndUpdate(
      req.params.id,
      { $set: { nom, valide } },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Catégorie mise à jour avec succès',
      categorie
    });

  } catch (error) {
    console.error('❌ Erreur updateCategorie:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'ID de catégorie invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la catégorie'
    });
  }
};

/**
 * @desc    Supprimer une catégorie
 * @route   DELETE /categorie/:id
 * @access  Public
 */
const deleteCategorie = async (req, res) => {
  try {
    const categorie = await Categorie.findById(req.params.id);

    if (!categorie) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }

    await categorie.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur deleteCategorie:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'ID de catégorie invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la catégorie'
    });
  }
};

/**
 * @desc    Activer/Désactiver une catégorie
 * @route   PATCH /categorie/:id/toggle
 * @access  Public
 */
const toggleCategorieValide = async (req, res) => {
  try {
    const categorie = await Categorie.findById(req.params.id);

    if (!categorie) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }

    categorie.valide = !categorie.valide;
    await categorie.save();

    res.status(200).json({
      success: true,
      message: `Catégorie ${categorie.valide ? 'activée' : 'désactivée'} avec succès`,
      categorie
    });

  } catch (error) {
    console.error('❌ Erreur toggleCategorieValide:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'ID de catégorie invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du statut'
    });
  }
};

/**
 * @desc    Récupérer les catégories valides uniquement
 * @route   GET /categorie/valides
 * @access  Public
 */
const getCategoriesValides = async (req, res) => {
  try {
    const categories = await Categorie.find({ valide: true }).sort({ nom: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });

  } catch (error) {
    console.error('❌ Erreur getCategoriesValides:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories valides'
    });
  }
};
/**
 * @desc    Créer plusieurs catégories à la fois
 * @route   POST /categorie/insert-multiple
 * @access  Public
 */
const createMultipleCategories = async (req, res) => {
  try {
    const categories = req.body; // Devrait être un tableau

    // Vérifier que c'est bien un tableau
    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Les données doivent être un tableau de catégories'
      });
    }

    // Vérifier que le tableau n'est pas vide
    if (categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le tableau ne peut pas être vide'
      });
    }

    // Valider chaque catégorie
    const errors = [];
    const validCategories = [];

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      
      if (!cat.nom) {
        errors.push(`L'élément à l'index ${i} n'a pas de nom`);
      } else {
        // Vérifier si le nom existe déjà
        const existing = await Categorie.findOne({ nom: cat.nom });
        if (existing) {
          errors.push(`La catégorie "${cat.nom}" existe déjà`);
        } else {
          validCategories.push({
            nom: cat.nom,
            valide: cat.valide !== undefined ? cat.valide : false
          });
        }
      }
    }

    // S'il y a des erreurs, on retourne
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Certaines catégories n\'ont pas pu être créées',
        errors
      });
    }

    // Insérer toutes les catégories valides
    const createdCategories = await Categorie.insertMany(validCategories);

    res.status(201).json({
      success: true,
      message: `${createdCategories.length} catégories créées avec succès`,
      categories: createdCategories
    });

  } catch (error) {
    console.error('❌ Erreur createMultipleCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création multiple des catégories'
    });
  }
};

module.exports = {
  createCategorie,
  getAllCategories,
  getCategorieById,
  updateCategorie,
  deleteCategorie,
  toggleCategorieValide,
  getCategoriesValides,
  createMultipleCategories
};