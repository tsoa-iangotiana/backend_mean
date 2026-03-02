const mongoose = require('mongoose');
const Commande = require('../../models/commande.model');
const Boutique = require('../../models/boutique.model');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

const getStatutInfo = (statut) => {
  const map = {
    EN_ATTENTE: { label: 'En attente', couleur: 'orange' },
    PAYEE:      { label: 'Payée',      couleur: 'blue'   },
    LIVREE:     { label: 'Livrée',     couleur: 'green'  },
    RECUPEREE:  { label: 'Récupérée',  couleur: 'green'  },
    ANNULEE:    { label: 'Annulée',    couleur: 'red'    },
  };
  return map[statut] || { label: statut, couleur: 'grey' };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /boutique/:boutiqueId/commandes
// ─────────────────────────────────────────────────────────────────────────────

const getCommandesByBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const {
      statut,
      utilisateur,
      date_debut,
      date_fin,
      prix_min,
      prix_max,
      tri = 'date_desc',
      page = 1,
      limit = 10
    } = req.query;

    const filter = { boutique: boutiqueId };

    if (utilisateur) filter.utilisateur = utilisateur;

    if (statut) {
      const statuts = statut.split(',');
      filter.statut = statuts.length === 1 ? statuts[0] : { $in: statuts };
    }

    console.log('Filtre appliqué:', filter);

    if (date_debut || date_fin) {
      filter.createdAt = {};
      if (date_debut) filter.createdAt.$gte = new Date(date_debut);
      if (date_fin) {
        const fin = new Date(date_fin);
        fin.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = fin;
      }
    }

    if (prix_min || prix_max) {
      filter.montant_total = {};
      if (prix_min) filter.montant_total.$gte = parseFloat(prix_min);
      if (prix_max) filter.montant_total.$lte = parseFloat(prix_max);
    }

    let sort = {};
    switch (tri) {
      case 'date_asc':     sort = { createdAt: 1 };             break;
      case 'date_desc':    sort = { createdAt: -1 };            break;
      case 'montant_asc':  sort = { montant_total: 1 };         break;
      case 'montant_desc': sort = { montant_total: -1 };        break;
      case 'statut':       sort = { statut: 1, createdAt: -1 }; break;
      default:             sort = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const commandes = await Commande.find(filter)
      .populate('utilisateur', 'username email')
      .populate('items.produit', 'nom images')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`${commandes.length} commande(s) trouvée(s)`);

    const commandesEnrichies = commandes.map(commande => {
      const montantTotalAvecLivraison = commande.livraison
        ? commande.montant_total + commande.livraison.frais
        : commande.montant_total;

      return {
        _id:          commande._id,
        boutique:     commande.boutique,
        utilisateur:  commande.utilisateur,
        date:         commande.createdAt,
        montant_total: commande.montant_total,
        montant_total_avec_livraison: montantTotalAvecLivraison,
        statut:       commande.statut,
        statut_info:  getStatutInfo(commande.statut),
        nombre_articles: commande.items.reduce((sum, item) => sum + item.quantite, 0),
        apercu_produits: commande.items.slice(0, 3).map(item => ({
          nom:          item.produit.nom,
          image:        item.produit.images?.[0] || null,
          quantite:     item.quantite,
          prix_unitaire: item.prix_unitaire
        })),
        livraison:     commande.livraison || null,
        peut_annuler:  commande.statut === 'EN_ATTENTE',
        peut_livrer:   commande.statut === 'PAYEE' && !!commande.livraison,
        peut_recuperer: commande.statut === 'PAYEE' && !commande.livraison,
      };
    });

    const total = await Commande.countDocuments(filter);

    const stats = await Commande.aggregate([
      { $match: { boutique: new mongoose.Types.ObjectId(boutiqueId) } },
      {
        $group: {
          _id: null,
          total_commandes: { $sum: 1 },
          total_depense:   { $sum: '$montant_total' },
          total_frais_livraison: {
            $sum: {
              $cond: {
                if: { $ne: ['$livraison', null] },
                then: '$livraison.frais',
                else: 0
              }
            }
          },
          moyenne_panier:  { $avg: { $add: ['$montant_total', { $ifNull: ['$livraison.frais', 0] }] } },
          commandes_par_statut: { $push: '$statut' }
        }
      }
    ]);

    const statistiques = stats[0] ? {
      total_commandes: stats[0].total_commandes,
      total_depense:   Math.round(stats[0].total_depense * 100) / 100,
      total_frais_livraison: Math.round(stats[0].total_frais_livraison * 100) / 100,
      total_depense_avec_livraison: Math.round((stats[0].total_depense + stats[0].total_frais_livraison) * 100) / 100,
      moyenne_panier:  Math.round(stats[0].moyenne_panier * 100) / 100,
      repartition_statuts: {
        EN_ATTENTE: stats[0].commandes_par_statut.filter(s => s === 'EN_ATTENTE').length,
        PAYEE:      stats[0].commandes_par_statut.filter(s => s === 'PAYEE').length,
        LIVREE:     stats[0].commandes_par_statut.filter(s => s === 'LIVREE').length,
        RECUPEREE:  stats[0].commandes_par_statut.filter(s => s === 'RECUPEREE').length,
        ANNULEE:    stats[0].commandes_par_statut.filter(s => s === 'ANNULEE').length,
      }
    } : {
      total_commandes: 0,
      total_depense: 0,
      total_frais_livraison: 0,
      total_depense_avec_livraison: 0,
      moyenne_panier: 0,
      repartition_statuts: {}
    };

    res.json({
      message: commandesEnrichies.length === 0
        ? 'Aucune commande trouvée'
        : `${commandesEnrichies.length} commande(s) trouvée(s)`,
      commandes: commandesEnrichies,
      pagination: {
        page:  parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      statistiques,
      filtres_appliques: {
        boutique:    boutiqueId,
        utilisateur: utilisateur || null,
        statut:      statut || 'Tous',
        date_debut:  date_debut || null,
        date_fin:    date_fin   || null,
        tri
      },
      total_en_attente: statistiques.repartition_statuts.EN_ATTENTE || 0
    });

  } catch (error) {
    console.error('Erreur getCommandesByBoutique:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des commandes', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /boutique/:boutiqueId/commandes/dashboard
// (dashboard d'une seule boutique — inchangé)
// ─────────────────────────────────────────────────────────────────────────────

const getDashboardBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const boutiqueObjId  = new mongoose.Types.ObjectId(boutiqueId);

    const now                = new Date();
    const debutJour          = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const debutSemaine       = new Date(now); debutSemaine.setDate(now.getDate() - 6); debutSemaine.setHours(0,0,0,0);
    const debutMois          = new Date(now.getFullYear(), now.getMonth(), 1);
    const debutMoisPrecedent = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const finMoisPrecedent   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const debut30j           = new Date(now); debut30j.setDate(now.getDate() - 29); debut30j.setHours(0,0,0,0);

    const nonAnnule = { $nin: ['ANNULEE'] };

    // ── 1. Résumé global ──────────────────────────────────────────────────
    const resumeRaw = await Commande.aggregate([
      { $match: { boutique: boutiqueObjId } },
      {
        $group: {
          _id: null,
          total_commandes: { $sum: 1 },
          ca_total:        { $sum: '$montant_total' },
          moyenne_panier:  { $avg: '$montant_total' },
          statuts:         { $push: '$statut' },
          types: {
            $push: { $cond: [{ $ifNull: ['$livraison', false] }, 'livraison', 'recuperation'] }
          }
        }
      }
    ]);

    const r = resumeRaw[0];
    const countIn = (arr, val) => (arr || []).filter(x => x === val).length;
    const resume = r ? {
      total_commandes: r.total_commandes,
      ca_total:        Math.round(r.ca_total * 100) / 100,
      moyenne_panier:  Math.round(r.moyenne_panier * 100) / 100,
      repartition_statuts: {
        EN_ATTENTE: countIn(r.statuts, 'EN_ATTENTE'),
        LIVREE:     countIn(r.statuts, 'LIVREE'),
        RECUPEREE:  countIn(r.statuts, 'RECUPEREE'),
        ANNULEE:    countIn(r.statuts, 'ANNULEE'),
      },
      repartition_types: {
        livraison:    countIn(r.types, 'livraison'),
        recuperation: countIn(r.types, 'recuperation'),
      }
    } : {
      total_commandes: 0, ca_total: 0, moyenne_panier: 0,
      repartition_statuts: { EN_ATTENTE: 0, LIVREE: 0, RECUPEREE: 0, ANNULEE: 0 },
      repartition_types:   { livraison: 0, recuperation: 0 }
    };

    // ── 2. CA par période ─────────────────────────────────────────────────
    const periodesRaw = await Commande.aggregate([
      { $match: { boutique: boutiqueObjId, statut: nonAnnule } },
      {
        $facet: {
          aujourd_hui:    [{ $match: { createdAt: { $gte: debutJour }          } }, { $group: { _id: null, ca: { $sum: '$montant_total' }, nb: { $sum: 1 } } }],
          semaine:        [{ $match: { createdAt: { $gte: debutSemaine }       } }, { $group: { _id: null, ca: { $sum: '$montant_total' }, nb: { $sum: 1 } } }],
          mois_en_cours:  [{ $match: { createdAt: { $gte: debutMois }          } }, { $group: { _id: null, ca: { $sum: '$montant_total' }, nb: { $sum: 1 } } }],
          mois_precedent: [{ $match: { createdAt: { $gte: debutMoisPrecedent, $lte: finMoisPrecedent } } }, { $group: { _id: null, ca: { $sum: '$montant_total' }, nb: { $sum: 1 } } }],
        }
      }
    ]);

    const p = periodesRaw[0];
    const extract = (arr) => arr[0]
      ? { ca: Math.round(arr[0].ca * 100) / 100, nb_commandes: arr[0].nb }
      : { ca: 0, nb_commandes: 0 };

    const moisCourant = extract(p.mois_en_cours);
    const moisPrec    = extract(p.mois_precedent);
    const evolutionCA = moisPrec.ca > 0
      ? `${((moisCourant.ca - moisPrec.ca) / moisPrec.ca * 100).toFixed(1)}%`
      : 'N/A';

    // ── 3. Évolution journalière — 30 derniers jours ───────────────────────
    const evolutionJournaliere = await Commande.aggregate([
      { $match: { boutique: boutiqueObjId, statut: nonAnnule, createdAt: { $gte: debut30j } } },
      {
        $group: {
          _id:          { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          ca:           { $sum: '$montant_total' },
          nb_commandes: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', ca: { $round: ['$ca', 2] }, nb_commandes: 1 } }
    ]);

    // ── 4. Top 5 produits les plus vendus ─────────────────────────────────
    const topProduits = await Commande.aggregate([
      { $match: { boutique: boutiqueObjId, statut: nonAnnule } },
      { $unwind: '$items' },
      {
        $group: {
          _id:          '$items.produit',
          total_vendu:  { $sum: '$items.quantite' },
          ca_genere:    { $sum: { $multiply: ['$items.prix_unitaire', '$items.quantite'] } }
        }
      },
      { $sort: { total_vendu: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'produits', localField: '_id', foreignField: '_id', as: 'produit' } },
      { $unwind: '$produit' },
      {
        $project: {
          _id: 0,
          produit_id:  '$_id',
          nom:         '$produit.nom',
          image:       { $arrayElemAt: ['$produit.images', 0] },
          total_vendu: 1,
          ca_genere:   { $round: ['$ca_genere', 2] }
        }
      }
    ]);

    // ── 5. Top 5 clients les plus fréquents ───────────────────────────────
    const topClients = await Commande.aggregate([
      { $match: { boutique: boutiqueObjId, statut: nonAnnule } },
      {
        $group: {
          _id:           '$utilisateur',
          nb_commandes:  { $sum: 1 },
          total_depense: { $sum: '$montant_total' }
        }
      },
      { $sort: { nb_commandes: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'client' } },
      { $unwind: '$client' },
      {
        $project: {
          _id: 0,
          client_id:     '$_id',
          nom:           '$client.nom',
          prenom:        '$client.prenom',
          email:         '$client.email',
          nb_commandes:  1,
          total_depense: { $round: ['$total_depense', 2] }
        }
      }
    ]);

    // ── 6. Heures de pointe ────────────────────────────────────────────────
    const heuresDePointe = await Commande.aggregate([
      { $match: { boutique: boutiqueObjId } },
      { $group: { _id: { $hour: '$createdAt' }, nb_commandes: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, heure: '$_id', nb_commandes: 1 } }
    ]);

    // ── 7. Classement des meilleures boutiques ────────────────────────────
    const classementBoutiques = await Commande.aggregate([
      { $match: { statut: nonAnnule } },
      {
        $group: {
          _id:          '$boutique',
          nb_commandes: { $sum: 1 },
          ca_total:     { $sum: '$montant_total' }
        }
      },
      { $sort: { nb_commandes: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'boutiques', localField: '_id', foreignField: '_id', as: 'boutique' } },
      { $unwind: '$boutique' },
      {
        $project: {
          _id: 0,
          boutique_id:  '$_id',
          nom:          '$boutique.nom',
          photo:        '$boutique.profil_photo',
          nb_commandes: 1,
          ca_total:     { $round: ['$ca_total', 2] },
          est_boutique_courante: { $eq: ['$_id', boutiqueObjId] }
        }
      }
    ]);

    const rangBoutiqueCourante = classementBoutiques.findIndex(b => b.est_boutique_courante) + 1;

    res.json({
      boutique_id: boutiqueId,
      genere_le:   now,
      resume,
      periodes: {
        aujourd_hui:    extract(p.aujourd_hui),
        semaine:        extract(p.semaine),
        mois_en_cours:  moisCourant,
        mois_precedent: moisPrec,
        evolution_ca_vs_mois_precedent: evolutionCA
      },
      evolution_journaliere: evolutionJournaliere,
      top_produits:          topProduits,
      top_clients:           topClients,
      heures_de_pointe:      heuresDePointe,
      classement_boutiques: {
        rang_boutique_courante: rangBoutiqueCourante || null,
        top_10: classementBoutiques
      }
    });

  } catch (error) {
    console.error('Erreur getDashboardBoutique:', error);
    res.status(500).json({ message: 'Erreur dashboard', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /responsable/:responsableId/dashboard
// Vue globale de TOUTES les boutiques d'un responsable
// ─────────────────────────────────────────────────────────────────────────────
const getDashboardResponsable = async (req, res) => {
  try {
    const { responsableId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(responsableId)) {
      return res.status(400).json({ success: false, message: 'ID de responsable invalide' });
    }

    const responsableObjId = new mongoose.Types.ObjectId(responsableId);

    // 1. Récupérer toutes les boutiques du responsable
    const boutiques = await Boutique.find({ responsable: responsableObjId })
      .select('_id nom profil_photo active')
      .lean();

    if (!boutiques.length) {
      return res.status(404).json({ success: false, message: 'Aucune boutique trouvée pour ce responsable' });
    }

    const boutiqueIds = boutiques.map(b => b._id);

    const now                = new Date();
    const debutJour          = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const debutSemaine       = new Date(now); debutSemaine.setDate(now.getDate() - 6); debutSemaine.setHours(0,0,0,0);
    const debutMois          = new Date(now.getFullYear(), now.getMonth(), 1);
    const debutMoisPrecedent = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const finMoisPrecedent   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const debut30j           = new Date(now); debut30j.setDate(now.getDate() - 29); debut30j.setHours(0,0,0,0);

    const nonAnnule = { $nin: ['ANNULEE'] };
    const matchAll  = { boutique: { $in: boutiqueIds } };

    // Fonction utilitaire pour calculer le montant total incluant les frais de livraison
    const montantTotalAvecFrais = { $add: ['$montant_total', { $ifNull: ['$livraison.frais', 0] }] };

    // ── 2. Résumé global (toutes boutiques confondues) ────────────────────
    const resumeRaw = await Commande.aggregate([
      { $match: matchAll },
      {
        $group: {
          _id: null,
          total_commandes: { $sum: 1 },
          ca_total:        { $sum: montantTotalAvecFrais },
          somme_montants_avec_frais: { $sum: montantTotalAvecFrais }, // Pour moyenne panier avec frais
          statuts:         { $push: '$statut' },
          types: {
            $push: { $cond: [{ $ifNull: ['$livraison', false] }, 'livraison', 'recuperation'] }
          }
        }
      }
    ]);

    const r = resumeRaw[0];
    const countIn = (arr, val) => (arr || []).filter(x => x === val).length;
    const resume = r ? {
      total_commandes: r.total_commandes,
      ca_total:        Math.round(r.ca_total * 100) / 100,
      moyenne_panier:  r.total_commandes > 0 ? Math.round((r.somme_montants_avec_frais / r.total_commandes) * 100) / 100 : 0,
      repartition_statuts: {
        EN_ATTENTE: countIn(r.statuts, 'EN_ATTENTE'),
        PAYEE:      countIn(r.statuts, 'PAYEE'),
        LIVREE:     countIn(r.statuts, 'LIVREE'),
        RECUPEREE:  countIn(r.statuts, 'RECUPEREE'),
        ANNULEE:    countIn(r.statuts, 'ANNULEE'),
      },
      repartition_types: {
        livraison:    countIn(r.types, 'livraison'),
        recuperation: countIn(r.types, 'recuperation'),
      }
    } : {
      total_commandes: 0, ca_total: 0, moyenne_panier: 0,
      repartition_statuts: { EN_ATTENTE: 0, PAYEE: 0, LIVREE: 0, RECUPEREE: 0, ANNULEE: 0 },
      repartition_types:   { livraison: 0, recuperation: 0 }
    };

    // ── 3. CA par période ─────────────────────────────────────────────────
    const periodesRaw = await Commande.aggregate([
      { $match: { ...matchAll, statut: nonAnnule } },
      {
        $facet: {
          aujourd_hui:    [{ $match: { createdAt: { $gte: debutJour } } }, 
                           { $group: { _id: null, ca: { $sum: montantTotalAvecFrais }, nb: { $sum: 1 } } }],
          semaine:        [{ $match: { createdAt: { $gte: debutSemaine } } }, 
                           { $group: { _id: null, ca: { $sum: montantTotalAvecFrais }, nb: { $sum: 1 } } }],
          mois_en_cours:  [{ $match: { createdAt: { $gte: debutMois } } }, 
                           { $group: { _id: null, ca: { $sum: montantTotalAvecFrais }, nb: { $sum: 1 } } }],
          mois_precedent: [{ $match: { createdAt: { $gte: debutMoisPrecedent, $lte: finMoisPrecedent } } }, 
                           { $group: { _id: null, ca: { $sum: montantTotalAvecFrais }, nb: { $sum: 1 } } }],
        }
      }
    ]);

    const p = periodesRaw[0];
    const extract = (arr) => arr[0]
      ? { ca: Math.round(arr[0].ca * 100) / 100, nb_commandes: arr[0].nb }
      : { ca: 0, nb_commandes: 0 };

    const moisCourant = extract(p.mois_en_cours);
    const moisPrec    = extract(p.mois_precedent);
    const evolutionCA = moisPrec.ca > 0
      ? `${((moisCourant.ca - moisPrec.ca) / moisPrec.ca * 100).toFixed(1)}%`
      : 'N/A';

    // ── 4. Évolution journalière — 30 derniers jours ──────────────────────
    const evolutionJournaliere = await Commande.aggregate([
      { $match: { ...matchAll, statut: nonAnnule, createdAt: { $gte: debut30j } } },
      {
        $group: {
          _id:          { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          ca:           { $sum: montantTotalAvecFrais },
          nb_commandes: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', ca: { $round: ['$ca', 2] }, nb_commandes: 1 } }
    ]);

    // ── 5. Performances par boutique (vue comparative clé) ────────────────
    const performancesRaw = await Commande.aggregate([
      { $match: { ...matchAll, statut: nonAnnule } },
      {
        $group: {
          _id:            '$boutique',
          nb_commandes:   { $sum: 1 },
          ca_total:       { $sum: montantTotalAvecFrais },
          somme_montants_avec_frais: { $sum: montantTotalAvecFrais } // Pour moyenne panier avec frais
        }
      },
      { $sort: { ca_total: -1 } },
      {
        $lookup: {
          from: 'boutiques', localField: '_id', foreignField: '_id', as: 'boutique'
        }
      },
      { $unwind: '$boutique' },
      {
        $project: {
          _id: 0,
          boutique_id:    '$_id',
          nom:            '$boutique.nom',
          photo:          '$boutique.profil_photo',
          active:         '$boutique.active',
          nb_commandes:   1,
          ca_total:       { $round: ['$ca_total', 2] },
          moyenne_panier: { $cond: { if: { $gt: ['$nb_commandes', 0] }, then: { $round: [{ $divide: ['$somme_montants_avec_frais', '$nb_commandes'] }, 2] }, else: 0 } }
        }
      }
    ]);

    // Inclure les boutiques sans aucune commande
    const performancesParBoutique = boutiques.map(b => {
      const found = performancesRaw.find(p => String(p.boutique_id) === String(b._id));
      return found || {
        boutique_id:    b._id,
        nom:            b.nom,
        photo:          b.profil_photo,
        active:         b.active,
        nb_commandes:   0,
        ca_total:       0,
        moyenne_panier: 0
      };
    });

    // ── 6. Top 5 produits toutes boutiques confondues ─────────────────────
    const topProduits = await Commande.aggregate([
      { $match: { ...matchAll, statut: nonAnnule } },
      { $unwind: '$items' },
      {
        $group: {
          _id:         '$items.produit',
          total_vendu: { $sum: '$items.quantite' },
          ca_genere:   { $sum: { $multiply: ['$items.prix_unitaire', '$items.quantite'] } }
        }
      },
      { $sort: { total_vendu: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'produits', localField: '_id', foreignField: '_id', as: 'produit' } },
      { $unwind: '$produit' },
      {
        $project: {
          _id: 0,
          produit_id:  '$_id',
          nom:         '$produit.nom',
          image:       { $arrayElemAt: ['$produit.images', 0] },
          total_vendu: 1,
          ca_genere:   { $round: ['$ca_genere', 2] }
        }
      }
    ]);

    // ── 7. Top 5 clients toutes boutiques confondues ──────────────────────
    const topClients = await Commande.aggregate([
      { $match: { ...matchAll, statut: nonAnnule } },
      {
        $group: {
          _id:           '$utilisateur',
          nb_commandes:  { $sum: 1 },
          total_depense: { $sum: montantTotalAvecFrais }
        }
      },
      { $sort: { total_depense: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'client' } },
      { $unwind: '$client' },
      {
        $project: {
          _id: 0,
          client_id:     '$_id',
          nom:           '$client.username',
          prenom:        '$client.prenom',
          email:         '$client.email',
          nb_commandes:  1,
          total_depense: { $round: ['$total_depense', 2] }
        }
      }
    ]);

    // ── 8. Heures de pointe toutes boutiques confondues ───────────────────
    const heuresDePointe = await Commande.aggregate([
      { $match: matchAll },
      { $group: { _id: { $hour: '$createdAt' }, nb_commandes: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, heure: '$_id', nb_commandes: 1 } }
    ]);

    // ── Réponse ────────────────────────────────────────────────────────────
    res.json({
      responsable_id: responsableId,
      nb_boutiques:   boutiques.length,
      boutiques_info: boutiques,
      genere_le:      now,

      resume,

      periodes: {
        aujourd_hui:    extract(p.aujourd_hui),
        semaine:        extract(p.semaine),
        mois_en_cours:  moisCourant,
        mois_precedent: moisPrec,
        evolution_ca_vs_mois_precedent: evolutionCA
      },

      evolution_journaliere:     evolutionJournaliere,
      performances_par_boutique: performancesParBoutique,
      top_produits:              topProduits,
      top_clients:               topClients,
      heures_de_pointe:          heuresDePointe,
    });

  } catch (error) {
    console.error('Erreur getDashboardResponsable:', error);
    res.status(500).json({ message: 'Erreur dashboard responsable', error: error.message });
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /boutique/:boutiqueId/commandes/:commandeId/livrer
// ─────────────────────────────────────────────────────────────────────────────

const marquerCommandeLivree = async (req, res) => {
  try {
    const { boutiqueId, commandeId } = req.params;
    const commande = await Commande.findOne({ _id: commandeId, boutique: boutiqueId });

    if (!commande)
      return res.status(404).json({ success: false, message: 'Commande introuvable pour cette boutique.' });
    if (!commande.livraison)
      return res.status(400).json({ success: false, message: 'Cette commande est prévue pour une récupération en boutique, pas une livraison.' });
    if (commande.statut !== 'PAYEE')
      return res.status(400).json({ success: false, message: `Impossible de livrer une commande au statut "${commande.statut}".` });

    commande.statut = 'LIVREE';
    await commande.save();
    res.status(200).json({ success: true, message: 'Commande marquée comme livrée avec succès.', data: commande });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /boutique/:boutiqueId/commandes/:commandeId/recuperer
// ─────────────────────────────────────────────────────────────────────────────

const marquerCommandeRecuperee = async (req, res) => {
  try {
    const { boutiqueId, commandeId } = req.params;
    const commande = await Commande.findOne({ _id: commandeId, boutique: boutiqueId });

    if (!commande)
      return res.status(404).json({ success: false, message: 'Commande introuvable pour cette boutique.' });
    if (commande.livraison)
      return res.status(400).json({ success: false, message: 'Cette commande est prévue pour une livraison, pas une récupération en boutique.' });
    if (commande.statut !== 'PAYEE') {
      return res.status(400).json({
        success: false,
        message: `Seules les commandes PAYEES peuvent être marquées comme récupérées.`
      });
    }

    commande.statut = 'RECUPEREE';
    await commande.save();
    res.status(200).json({ success: true, message: 'Commande marquée comme récupérée avec succès.', data: commande });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  getCommandesByBoutique,
  getDashboardBoutique,
  getDashboardResponsable,   // ← nouvelle export
  marquerCommandeLivree,
  marquerCommandeRecuperee,
};