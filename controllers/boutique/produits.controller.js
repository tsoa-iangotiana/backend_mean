const cloudinary = require('../../config/cloudinary');
const Produit = require('../../models/produit.model');
const Boutique = require('../../models/boutique.model');
const mongoose = require('mongoose');

// @desc    Insérer plusieurs produits avec images
// @route   POST /api/produit
const createProduit = async (req, res) => {
  try {
    const { produits, boutiqueId } = req.body;

    // ✅ Vérifier que boutiqueId est fourni
    if (!boutiqueId) {
      return res.status(400).json({ 
        message: 'ID de la boutique requis' 
      });
    }

    // ✅ Optionnel : Vérifier que la boutique existe et que l'utilisateur y a accès
    if (req.user) {
      const boutique = await Boutique.findOne({ 
        _id: boutiqueId, 
        responsable: req.user._id 
      });
      
      if (!boutique) {
        return res.status(403).json({ 
          message: 'Vous n\'êtes pas autorisé à gérer cette boutique' 
        });
      }
    }

    if (!Array.isArray(produits)) {
      return res.status(400).json({ 
        message: 'Format: tableau de produits requis' 
      });
    }

    if (produits.length === 0) {
      return res.status(400).json({ 
        message: 'Au moins un produit requis' 
      });
    }

    // Valider chaque produit
    for (const produit of produits) {
      if (!produit.nom || !produit.prix || !produit.categorie) {
        return res.status(400).json({ 
          message: 'Chaque produit doit avoir un nom, un prix et une catégorie' 
        });
      }
    }

    // ✅ Ajouter l'ID de la boutique à chaque produit
    const produitsAvecBoutique = produits.map(produit => ({
      ...produit,
      boutique: boutiqueId,
      images: produit.images || []
    }));

    const nouveauxProduits = await Produit.insertMany(produitsAvecBoutique);
    
    // Populer les catégories pour la réponse
    const produitsPopules = await Produit.find({
      _id: { $in: nouveauxProduits.map(p => p._id) }
    }).populate('categorie', 'nom');
    
    res.status(201).json({
      message: `${nouveauxProduits.length} produit(s) ajouté(s)`,
      produits: produitsPopules
    });
  } catch (error) {
    console.error('❌ Erreur création produit:', error);
    res.status(500).json({ 
      message: error.message || 'Erreur lors de la création des produits' 
    });
  }
};

const getProduits = async (req, res) => {
  try {
    const { page = 1, limit = 20, actif, categorie, search, boutiqueId } = req.query;
    
    console.log('→ Début getProduits | boutiqueId:', boutiqueId);
    console.log('→ Paramètres reçus:', { page, limit, actif, categorie, search });
    console.log('→ Rôle utilisateur:', req.user?.role); // Debug

    if (!boutiqueId) {
      return res.status(400).json({ message: 'ID de la boutique requis' });
    }

    // ✅ Vérifier que la boutique existe d'abord
    const boutiqueExists = await Boutique.findById(boutiqueId);
    if (!boutiqueExists) {
      return res.status(404).json({ message: 'Boutique non trouvée' });
    }

    // ✅ Vérification d'autorisation selon le rôle
    if (req.user.role === 'boutique') {
      // Pour un responsable boutique : vérifier que c'est SA boutique
      console.time('→ Vérification autorisation boutique');
      const boutique = await Boutique.findOne({ 
        _id: boutiqueId, 
        responsable: req.user._id 
      });
      console.timeEnd('→ Vérification autorisation boutique');

      if (!boutique) {
        return res.status(403).json({ message: 'Accès non autorisé à cette boutique' });
      }
    }
    // Pour un acheteur : pas de vérification supplémentaire
    // (il peut voir les produits de toutes les boutiques)

    let query = { boutique: new mongoose.Types.ObjectId(boutiqueId) };
    
    // Gestion du filtre actif selon le rôle
    if (req.user.role === 'acheteur') {
      // Pour les acheteurs, toujours voir uniquement les produits actifs
      query.actif = true;
    } else if (actif !== undefined) {
      // Pour les boutiques, appliquer le filtre actif s'il est fourni
      query.actif = actif === 'true';
    }

    if (categorie) query.categorie = new mongoose.Types.ObjectId(categorie);
    if (search) {
      query.nom = { $regex: search.trim(), $options: 'i' };
    }

    console.log('→ Query construite:', JSON.stringify(query, null, 2));

    console.time('→ find() + populate');
    const produits = await Produit.find(query)
      .populate({
        path: 'categorie',
        select: 'nom'
      })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    console.timeEnd('→ find() + populate');

    console.time('→ countDocuments');
    const total = await Produit.countDocuments(query);
    console.timeEnd('→ countDocuments');

    console.log('→ Résultat:', {
      nbProduitsTrouves: produits.length,
      totalEnBase: total,
      pageActuelle: Number(page),
      limit: Number(limit)
    });

    res.json({
      produits,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error('❌ Erreur dans getProduits:', error);
    res.status(500).json({ message: error.message || 'Erreur serveur interne' });
  }
};

// @desc    Obtenir un produit
// @route   GET /api/produit/:id?boutiqueId=xxx
const getProduit = async (req, res) => {
  try {
    const { boutiqueId } = req.query;
    
    if (!boutiqueId) {
      return res.status(400).json({ message: 'ID de la boutique requis' });
    }

    const produit = await Produit.findOne({
      _id: req.params.id,
      boutique: boutiqueId
    }).populate('categorie');

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json(produit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProduit = async (req, res) => {
  try {
    const { nom, description, prix, unite, stock, categorie, actif, boutiqueId, existingImages } = req.body;

    if (!boutiqueId) {
      return res.status(400).json({ message: 'ID de la boutique requis' });
    }

    const produit = await Produit.findOne({
      _id: req.params.id,
      boutique: boutiqueId
    });

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    // ✅ Images existantes à conserver (envoyées depuis le frontend)
    let finalImages = [];
    if (existingImages) {
      finalImages = Array.isArray(existingImages) ? existingImages : [existingImages];
    }

    // ✅ Supprimer de Cloudinary les images qui ne sont plus conservées
    if (produit.images && produit.images.length > 0) {
      for (let imageUrl of produit.images) {
        if (!finalImages.includes(imageUrl)) {
          try {
            const publicId = imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`produits/${publicId}`);
            console.log(`🗑️ Image supprimée de Cloudinary : ${publicId}`);
          } catch (cloudinaryError) {
            console.warn(`⚠️ Impossible de supprimer l'image Cloudinary : ${cloudinaryError.message}`);
          }
        }
      }
    }

    // ✅ Upload des nouvelles images
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file =>
        new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: 'produits',
              transformation: [
                { width: 800, height: 800, crop: 'limit' },
                { quality: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          ).end(file.buffer);
        })
      );

      const newImages = await Promise.all(uploadPromises);
      finalImages = [...finalImages, ...newImages]; // ✅ Merge conservées + nouvelles
      console.log(`📸 ${newImages.length} nouvelle(s) image(s) uploadée(s)`);
    }

    // ✅ Mise à jour des champs
    produit.nom = nom;
    produit.description = description;
    produit.prix = prix;
    produit.unite = unite;
    produit.stock = stock;
    produit.categorie = categorie;
    produit.actif = actif;
    produit.images = finalImages;

    await produit.save();

    console.log(`✅ Produit ${produit._id} mis à jour avec ${finalImages.length} image(s)`);
    res.json(produit);

  } catch (error) {
    console.error('❌ Erreur updateProduit:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer un produit
// @route   DELETE /api/produit/:id?boutiqueId=xxx
const deleteProduit = async (req, res) => {
  try {

    const produit = await Produit.findOneAndDelete({
      _id: req.params.id
    });

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Situation de stock d'un produit
// @route   GET /api/produit/:id/stock?boutiqueId=xxx
const getSituationStock = async (req, res) => {
  try {
    const { boutiqueId } = req.query;
    
    if (!boutiqueId) {
      return res.status(400).json({ message: 'ID de la boutique requis' });
    }

    const produit = await Produit.findOne({
      _id: req.params.id,
      boutique: boutiqueId
    });

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    const seuilAlerte = 10;
    
    res.json({
      produit_id: produit._id,
      nom: produit.nom,
      stock_actuel: produit.stock,
      unite: produit.unite,
      alerte_stock: produit.stock <= seuilAlerte,
      seuil_alerte: seuilAlerte,
      statut: produit.stock === 0 ? 'RUPTURE' : produit.stock <= seuilAlerte ? 'FAIBLE' : 'NORMAL'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour le stock
// @route   PUT /api/produit/:id/stock
const updateStock = async (req, res) => {
  try {
    const { quantite, operation, boutiqueId } = req.body; // operation: 'SET', 'ADD', 'SUBTRACT'
    
    if (!boutiqueId) {
      return res.status(400).json({ message: 'ID de la boutique requis' });
    }

    let produit = await Produit.findOne({
      _id: req.params.id,
      boutique: boutiqueId
    });

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    let nouveauStock = produit.stock;
    
    switch(operation) {
      case 'ADD':
        nouveauStock += quantite;
        break;
      case 'SUBTRACT':
        nouveauStock = Math.max(0, produit.stock - quantite);
        break;
      default: // SET
        nouveauStock = quantite;
    }

    produit.stock = nouveauStock;
    await produit.save();

    res.json({
      message: 'Stock mis à jour',
      produit: {
        id: produit._id,
        nom: produit.nom,
        stock: produit.stock
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadProduitImages = async (req, res) => {
  try {
    const { id } = req.params;

    const produit = await Produit.findById(id);
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }

    const uploadPromises = req.files.map(file =>
      new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'produits',
            transformation: [
              { width: 800, height: 800, crop: 'limit' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        ).end(file.buffer);
      })
    );

    const uploadedImages = await Promise.all(uploadPromises);

    produit.images = [...produit.images, ...uploadedImages];
    await produit.save();

    res.status(200).json({
      message: 'Images uploadées avec succès',
      images: produit.images
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur upload images' });
  }
};

module.exports = {
  createProduit,
  getProduits,
  getProduit,
  updateProduit,
  deleteProduit,
  getSituationStock,
  updateStock,
  uploadProduitImages
};