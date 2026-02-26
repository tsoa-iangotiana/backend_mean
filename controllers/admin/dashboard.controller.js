/**
 * dashboard.controller.js
 * Contrôleur Express.js — Dashboard Administrateur Centre Commercial
 *
 * Routes suggérées (à monter dans dashboard.routes.js) :
 *
 *   GET /api/admin/dashboard/boxes          → getBoxesStats
 *   GET /api/admin/dashboard/boutiques      → getBoutiquesStats
 *   GET /api/admin/dashboard/finances       → getFinancesStats
 *   GET /api/admin/dashboard/commandes      → getCommandesStats
 *   GET /api/admin/dashboard/tickets        → getTicketsStats
 *   GET /api/admin/dashboard/avis           → getAvisStats
 *   GET /api/admin/dashboard/overview       → getOverview   (snapshot global)
 */

const Box           = require('../../models/box.model');
const Boutique      = require('../../models/boutique.model');
const BoxHistorique = require('../../models/box_historique.model');
const Commande      = require('../../models/commande.model');
const Paiement      = require('../../models/paiement.model');
const Ticket        = require('../../models/ticket.model');
const Avis          = require('../../models/avis.model');

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES INTERNES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne le début et la fin d'une période glissante en mois.
 * @param {number} nbMois - Nombre de mois à remonter (défaut : 6)
 */
function getPeriode(nbMois = 6) {
  const fin   = new Date();
  const debut = new Date();
  debut.setMonth(debut.getMonth() - nbMois);
  debut.setDate(1);
  debut.setHours(0, 0, 0, 0);
  return { debut, fin };
}

/**
 * Regroupe un résultat d'aggregation par mois et complète
 * les mois manquants avec la valeur 0.
 * @param {Array}  data     - Résultat d'aggregation [{_id: {annee, mois}, ...}]
 * @param {number} nbMois
 * @param {string} valueKey - Clé de valeur dans chaque document
 */
function remplirMoisManquants(data, nbMois = 6, valueKey = 'total') {
  const result = [];
  const now    = new Date();

  for (let i = nbMois - 1; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const annee = d.getFullYear();
    const mois  = d.getMonth() + 1; // 1-indexé

    const found = data.find(
      (x) => x._id.annee === annee && x._id.mois === mois
    );

    result.push({
      annee,
      mois,
      label: d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' }),
      [valueKey]: found ? found[valueKey] : 0,
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BOXES & OCCUPATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard/boxes
 *
 * Retourne :
 *  - total         : nombre total de boxes
 *  - occupees      : boxes occupées (libre === false)
 *  - libres        : boxes disponibles
 *  - taux_occupation : pourcentage (arrondi)
 *  - detail        : liste complète des boxes avec boutique actuelle si occupée
 */
exports.getBoxesStats = async (req, res) => {
  try {
    // Toutes les boxes
    const boxes = await Box.find().lean();

    // Boutiques actives avec leur box associée
    const boutiquesActives = await Boutique.find(
      { box: { $ne: null }, active: true },
      { nom: 1, box: 1, note_moyenne: 1 }
    ).lean();

    // Map boxId -> boutique pour enrichir le détail
    const boutiqueParBox = {};
    boutiquesActives.forEach((b) => {
      boutiqueParBox[b.box.toString()] = { nom: b.nom, id: b._id };
    });

    const total    = boxes.length;
    const occupees = boxes.filter((b) => !b.libre).length;
    const libres   = total - occupees;

    const detail = boxes.map((box) => ({
      ...box,
      boutique_actuelle: boutiqueParBox[box._id.toString()] || null,
    }));

    return res.json({
      success: true,
      data: {
        total,
        occupees,
        libres,
        taux_occupation: total > 0 ? Math.round((occupees / total) * 100) : 0,
        detail,
      },
    });
  } catch (err) {
    console.error('[getBoxesStats]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. BOUTIQUES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard/boutiques
 * Query params :
 *  - tri  : "note" | "commandes" (défaut : "note")
 *  - actif: "true" | "false" | "all" (défaut : "all")
 *
 * Retourne :
 *  - total         : nombre total de boutiques
 *  - actives       : nombre de boutiques actives
 *  - inactives     : nombre de boutiques inactives
 *  - liste         : boutiques enrichies avec nb_commandes
 */
exports.getBoutiquesStats = async (req, res) => {
  try {
    const { tri = 'note', actif = 'all' } = req.query;

    // Filtre
    const filtre = {};
    if (actif === 'true')  filtre.active = true;
    if (actif === 'false') filtre.active = false;

    const boutiques = await Boutique.find(filtre)
      .populate('box',        'numero surface prix_loyer libre')
      .populate('categories', 'nom')
      .lean();

    // Nombre de commandes par boutique (toutes, statuts confondus)
    const commandesParBoutique = await Commande.aggregate([
      { $group: { _id: '$boutique', nb_commandes: { $sum: 1 } } },
    ]);

    const mapCommandes = {};
    commandesParBoutique.forEach((c) => {
      mapCommandes[c._id.toString()] = c.nb_commandes;
    });

    // Enrichissement
    let liste = boutiques.map((b) => ({
      ...b,
      nb_commandes: mapCommandes[b._id.toString()] || 0,
    }));

    // Tri
    if (tri === 'commandes') {
      liste.sort((a, b) => b.nb_commandes - a.nb_commandes);
    } else {
      liste.sort((a, b) => b.note_moyenne - a.note_moyenne);
    }

    return res.json({
      success: true,
      data: {
        total:    boutiques.length,
        actives:  boutiques.filter((b) => b.active).length,
        inactives: boutiques.filter((b) => !b.active).length,
        liste,
      },
    });
  } catch (err) {
    console.error('[getBoutiquesStats]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. FINANCES (LOYERS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard/finances
 * Query params :
 *  - mois : nombre de mois de l'historique (défaut : 6)
 *
 * Retourne :
 *  - total_periode        : total des loyers encaissés sur la période
 *  - mois_en_cours        : loyers du mois actuel
 *  - evolution_mensuelle  : tableau mois par mois
 *  - statut_paiements     : par boutique — à_jour / en_retard
 */
exports.getFinancesStats = async (req, res) => {
  try {
    const nbMois        = parseInt(req.query.mois) || 6;
    const { debut, fin } = getPeriode(nbMois);

    // ── Historique mensuel des loyers ────────────────────────────────────────
    const historiqueRaw = await Paiement.aggregate([
      { $match: { date_paiement: { $gte: debut, $lte: fin } } },
      {
        $group: {
          _id: {
            annee: { $year:  '$date_paiement' },
            mois:  { $month: '$date_paiement' },
          },
          total: { $sum: '$montant' },
        },
      },
    ]);

    const evolution_mensuelle = remplirMoisManquants(historiqueRaw, nbMois, 'total');
    const total_periode       = evolution_mensuelle.reduce((acc, m) => acc + m.total, 0);

    // Mois en cours
    const debutMoisCourant = new Date();
    debutMoisCourant.setDate(1);
    debutMoisCourant.setHours(0, 0, 0, 0);

    const paiementsMoisCourant = await Paiement.aggregate([
      { $match: { date_paiement: { $gte: debutMoisCourant } } },
      { $group: { _id: null, total: { $sum: '$montant' } } },
    ]);
    const mois_en_cours = paiementsMoisCourant[0]?.total || 0;

    // ── Statut des paiements par boutique ────────────────────────────────────
    // On considère qu'une boutique est "en retard" si sa date_fin
    // du dernier paiement est dépassée.
    const boutiquesActives = await Boutique.find({ active: true }, { nom: 1 }).lean();

    // Dernier paiement par boutique
    const derniersPaiements = await Paiement.aggregate([
      {
        $sort: { date_fin: -1 },
      },
      {
        $group: {
          _id:      '$boutique',
          date_fin: { $first: '$date_fin' },
          periode:  { $first: '$periode' },
        },
      },
    ]);

    const mapPaiements = {};
    derniersPaiements.forEach((p) => {
      mapPaiements[p._id.toString()] = p;
    });

    const maintenant = new Date();
    const statut_paiements = boutiquesActives.map((b) => {
      const paiement = mapPaiements[b._id.toString()];
      if (!paiement) {
        return { boutique_id: b._id, nom: b.nom, statut: 'AUCUN_PAIEMENT', date_fin: null };
      }
      const enRetard = paiement.date_fin < maintenant;
      return {
        boutique_id: b._id,
        nom:         b.nom,
        statut:      enRetard ? 'EN_RETARD' : 'A_JOUR',
        date_fin:    paiement.date_fin,
        periode:     paiement.periode,
      };
    });

    return res.json({
      success: true,
      data: {
        total_periode,
        mois_en_cours,
        evolution_mensuelle,
        statut_paiements,
        nb_en_retard: statut_paiements.filter(
          (s) => s.statut === 'EN_RETARD' || s.statut === 'AUCUN_PAIEMENT'
        ).length,
      },
    });
  } catch (err) {
    console.error('[getFinancesStats]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. COMMANDES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard/commandes
 * Query params :
 *  - mois : nombre de mois de l'historique (défaut : 6)
 *
 * Retourne :
 *  - total_periode          : nb commandes sur la période
 *  - repartition_statuts    : par statut (PAYEE, EN_PREPARATION, PRETE, LIVREE)
 *  - evolution_mensuelle    : volume par mois, décomposé par mode (click_collect / livraison)
 *  - top_boutiques          : top 5 boutiques par volume de commandes
 *
 * Note : On distingue click_collect / livraison via un champ `mode_livraison`
 *        que vous pouvez ajouter au modèle Commande.
 *        Si ce champ n'existe pas encore, on retourne uniquement le total.
 */
exports.getCommandesStats = async (req, res) => {
  try {
    const nbMois         = parseInt(req.query.mois) || 6;
    const { debut, fin } = getPeriode(nbMois);

    // ── Répartition par statut (global, pas de restriction de période) ───────
    const repartitionRaw = await Commande.aggregate([
      { $group: { _id: '$statut', total: { $sum: 1 } } },
    ]);

    const STATUTS = ['PAYEE', 'EN_PREPARATION', 'PRETE', 'LIVREE'];
    const repartition_statuts = STATUTS.map((s) => ({
      statut: s,
      total:  repartitionRaw.find((r) => r._id === s)?.total || 0,
    }));

    // ── Évolution mensuelle sur la période ───────────────────────────────────
    const evolutionRaw = await Commande.aggregate([
      { $match: { createdAt: { $gte: debut, $lte: fin } } },
      {
        $group: {
          _id: {
            annee:         { $year:  '$createdAt' },
            mois:          { $month: '$createdAt' },
            mode_livraison: '$mode_livraison', // champ optionnel
          },
          total: { $sum: 1 },
        },
      },
    ]);

    // Reconstruction mois par mois avec décomposition click_collect / livraison
    const now    = new Date();
    const evolution_mensuelle = [];

    for (let i = nbMois - 1; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const annee = d.getFullYear();
      const mois  = d.getMonth() + 1;

      const moisData = evolutionRaw.filter(
        (x) => x._id.annee === annee && x._id.mois === mois
      );

      evolution_mensuelle.push({
        annee,
        mois,
        label:         d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' }),
        click_collect: moisData.find((x) => x._id.mode_livraison === 'CLICK_COLLECT')?.total || 0,
        livraison:     moisData.find((x) => x._id.mode_livraison === 'LIVRAISON')?.total     || 0,
        // Total si mode_livraison non renseigné
        total:         moisData.reduce((acc, x) => acc + x.total, 0),
      });
    }

    const total_periode = evolution_mensuelle.reduce((acc, m) => acc + m.total, 0);

    // ── Top 5 boutiques par volume ────────────────────────────────────────────
    const topBoutiquesRaw = await Commande.aggregate([
      { $match: { createdAt: { $gte: debut, $lte: fin } } },
      { $group: { _id: '$boutique', nb_commandes: { $sum: 1 } } },
      { $sort: { nb_commandes: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from:         'boutiques',
          localField:   '_id',
          foreignField: '_id',
          as:           'boutique',
        },
      },
      { $unwind: '$boutique' },
      {
        $project: {
          _id:           0,
          boutique_id:   '$_id',
          nom:           '$boutique.nom',
          nb_commandes:  1,
        },
      },
    ]);

    return res.json({
      success: true,
      data: {
        total_periode,
        repartition_statuts,
        evolution_mensuelle,
        top_boutiques: topBoutiquesRaw,
      },
    });
  } catch (err) {
    console.error('[getCommandesStats]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. TICKETS DE SUPPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard/tickets
 * Query params :
 *  - statut   : "OUVERT" | "EN_COURS" | "RESOLU" | "TOUS" (défaut : "TOUS")
 *  - priorite : "BASSE" | "MOYENNE" | "HAUTE" | "URGENT" | "TOUS" (défaut : "TOUS")
 *  - limite   : nb de tickets dans la liste (défaut : 20)
 *
 * Retourne :
 *  - compteurs          : par statut et par priorité
 *  - tickets_urgents    : tickets URGENT non résolus
 *  - liste              : tickets paginés selon les filtres
 */
exports.getTicketsStats = async (req, res) => {
  try {
    const { statut = 'TOUS', priorite = 'TOUS', limite = 20 } = req.query;

    // ── Compteurs globaux ────────────────────────────────────────────────────
    const [parStatut, parPriorite] = await Promise.all([
      Ticket.aggregate([
        { $group: { _id: '$statut', total: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $group: { _id: '$priorite', total: { $sum: 1 } } },
      ]),
    ]);

    const STATUTS_TICKET   = ['OUVERT', 'EN_COURS', 'RESOLU'];
    const PRIORITES_TICKET = ['BASSE', 'MOYENNE', 'HAUTE', 'URGENT'];

    const compteurs = {
      par_statut: STATUTS_TICKET.map((s) => ({
        statut: s,
        total:  parStatut.find((x) => x._id === s)?.total || 0,
      })),
      par_priorite: PRIORITES_TICKET.map((p) => ({
        priorite: p,
        total:    parPriorite.find((x) => x._id === p)?.total || 0,
      })),
    };

    // ── Tickets urgents non résolus ─────────────────────────────────────────
    const tickets_urgents = await Ticket.find({
      priorite: 'URGENT',
      statut:   { $ne: 'RESOLU' },
    })
      .populate('boutique', 'nom box')
      .sort({ createdAt: -1 })
      .lean();

    // ── Liste filtrée ────────────────────────────────────────────────────────
    const filtre = {};
    if (statut   !== 'TOUS') filtre.statut   = statut;
    if (priorite !== 'TOUS') filtre.priorite = priorite;

    const liste = await Ticket.find(filtre)
      .populate('boutique', 'nom')
      .sort({ createdAt: -1 })
      .limit(parseInt(limite))
      .select('-commentaires') // on n'envoie pas les commentaires dans le dashboard
      .lean();

    return res.json({
      success: true,
      data: {
        compteurs,
        tickets_urgents,
        liste,
      },
    });
  } catch (err) {
    console.error('[getTicketsStats]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. AVIS & SATISFACTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard/avis
 * Query params :
 *  - limite : nb de derniers avis (défaut : 10)
 *
 * Retourne :
 *  - note_moyenne_centre  : moyenne globale (avis de type BOUTIQUE)
 *  - total_avis           : nombre total d'avis
 *  - distribution_notes   : répartition 1 à 5 étoiles
 *  - top_boutiques        : top 5 boutiques les mieux notées
 *  - derniers_avis        : derniers avis avec boutique et commentaire
 */
exports.getAvisStats = async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 10;

    // ── Note moyenne globale & distribution ──────────────────────────────────
    const [globale, distribution] = await Promise.all([
      Avis.aggregate([
        { $match: { cible_type: 'BOUTIQUE' } },
        {
          $group: {
            _id:            null,
            note_moyenne:   { $avg: '$note' },
            total:          { $sum: 1 },
          },
        },
      ]),
      Avis.aggregate([
        { $match: { cible_type: 'BOUTIQUE' } },
        { $group: { _id: '$note', total: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
    ]);

    const note_moyenne_centre = globale[0]
      ? Math.round(globale[0].note_moyenne * 10) / 10
      : 0;
    const total_avis = globale[0]?.total || 0;

    // Compléter les notes manquantes (1 à 5)
    const distribution_notes = [5, 4, 3, 2, 1].map((n) => ({
      note:  n,
      label: `${n} ★`,
      total: distribution.find((d) => d._id === n)?.total || 0,
    }));

    // ── Top 5 boutiques par note ─────────────────────────────────────────────
    const top_boutiques = await Boutique.find({ active: true })
      .sort({ note_moyenne: -1 })
      .limit(5)
      .select('nom note_moyenne box')
      .populate('box', 'numero')
      .lean();

    // ── Derniers avis (boutiques) ────────────────────────────────────────────
    const derniers_avis = await Avis.find({ cible_type: 'BOUTIQUE' })
      .sort({ createdAt: -1 })
      .limit(limite)
      .populate('utilisateur', 'nom prenom')
      .lean()
      .then(async (avis) => {
        // Récupérer les noms des boutiques manuellement
        // (cible_id référence dynamiquement la boutique)
        const boutiqueIds = [...new Set(avis.map((a) => a.cible_id.toString()))];
        const boutiques   = await Boutique.find(
          { _id: { $in: boutiqueIds } },
          { nom: 1 }
        ).lean();

        const mapNom = {};
        boutiques.forEach((b) => { mapNom[b._id.toString()] = b.nom; });

        return avis.map((a) => ({
          ...a,
          boutique_nom: mapNom[a.cible_id.toString()] || 'Inconnu',
        }));
      });

    return res.json({
      success: true,
      data: {
        note_moyenne_centre,
        total_avis,
        distribution_notes,
        top_boutiques,
        derniers_avis,
      },
    });
  } catch (err) {
    console.error('[getAvisStats]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. OVERVIEW — Snapshot global (appelé au chargement du dashboard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard/overview
 *
 * Exécute toutes les requêtes critiques en parallèle et retourne
 * un snapshot compact pour alimenter les KPIs de la page d'accueil.
 *
 * Retourne :
 *  - boxes            : { total, occupees, libres, taux_occupation }
 *  - boutiques        : { total, actives, inactives }
 *  - loyers           : { mois_en_cours, nb_en_retard }
 *  - commandes        : { total_30j, repartition_statuts }
 *  - tickets          : { ouverts, urgents_non_resolus }
 *  - satisfaction     : { note_moyenne_centre, total_avis }
 */
exports.getOverview = async (req, res) => {
  try {
    const debut30j = new Date();
    debut30j.setDate(debut30j.getDate() - 30);

    const debutMoisCourant = new Date();
    debutMoisCourant.setDate(1);
    debutMoisCourant.setHours(0, 0, 0, 0);

    const maintenant = new Date();

    const [
      boxesData,
      boutiquesData,
      loyers30j,
      derniersLoyers,
      nbBoutiquesActives,
      commandes30j,
      statutsCommandes,
      ticketsOuverts,
      ticketsUrgents,
      avisGlobal,
    ] = await Promise.all([
      // Boxes
      Box.aggregate([
        {
          $group: {
            _id:      null,
            total:    { $sum: 1 },
            occupees: { $sum: { $cond: [{ $eq: ['$libre', false] }, 1, 0] } },
            libres:   { $sum: { $cond: [{ $eq: ['$libre', true]  }, 1, 0] } },
          },
        },
      ]),

      // Boutiques
      Boutique.aggregate([
        {
          $group: {
            _id:      null,
            total:    { $sum: 1 },
            actives:  { $sum: { $cond: ['$active', 1, 0] } },
            inactives:{ $sum: { $cond: ['$active', 0, 1] } },
          },
        },
      ]),

      // Loyers du mois en cours
      Paiement.aggregate([
        { $match: { date_paiement: { $gte: debutMoisCourant } } },
        { $group: { _id: null, total: { $sum: '$montant' } } },
      ]),

      // Dernier paiement par boutique (calcul retard fait après le Promise.all)
      Paiement.aggregate([
        { $sort:  { date_fin: -1 } },
        { $group: { _id: '$boutique', date_fin: { $first: '$date_fin' } } },
      ]),
      // Nombre de boutiques actives (pour détecter celles sans aucun paiement)
      Boutique.countDocuments({ active: true }),

      // Commandes 30 derniers jours
      Commande.countDocuments({ createdAt: { $gte: debut30j } }),

      // Répartition statuts commandes
      Commande.aggregate([
        { $group: { _id: '$statut', total: { $sum: 1 } } },
      ]),

      // Tickets ouverts
      Ticket.countDocuments({ statut: { $in: ['OUVERT', 'EN_COURS'] } }),

      // Tickets urgents non résolus
      Ticket.countDocuments({ priorite: 'URGENT', statut: { $ne: 'RESOLU' } }),

      // Note moyenne centre
      Avis.aggregate([
        { $match: { cible_type: 'BOUTIQUE' } },
        {
          $group: {
            _id:          null,
            note_moyenne: { $avg: '$note' },
            total:        { $sum: 1 },
          },
        },
      ]),
    ]);

    const boxes     = boxesData[0]     || { total: 0, occupees: 0, libres: 0 };
    const boutiques = boutiquesData[0] || { total: 0, actives: 0, inactives: 0 };

    const STATUTS = ['PAYEE', 'EN_PREPARATION', 'PRETE', 'LIVREE'];
    const repartition_statuts = STATUTS.map((s) => ({
      statut: s,
      total:  statutsCommandes.find((x) => x._id === s)?.total || 0,
    }));

    return res.json({
      success: true,
      data: {
        boxes: {
          total:            boxes.total,
          occupees:         boxes.occupees,
          libres:           boxes.libres,
          taux_occupation:  boxes.total > 0
            ? Math.round((boxes.occupees / boxes.total) * 100)
            : 0,
        },
        boutiques: {
          total:     boutiques.total,
          actives:   boutiques.actives,
          inactives: boutiques.inactives,
        },
        loyers: {
          mois_en_cours: loyers30j[0]?.total || 0,
          nb_en_retard:  (() => {
            // Boutiques ayant un paiement à jour (date_fin >= maintenant)
            const aJour = derniersLoyers.filter(p => p.date_fin >= maintenant).length;
            // Toutes les boutiques actives moins celles à jour = retard + jamais payé
            return nbBoutiquesActives - aJour;
          })(),
        },
        commandes: {
          total_30j:         commandes30j,
          repartition_statuts,
        },
        tickets: {
          ouverts:              ticketsOuverts,
          urgents_non_resolus:  ticketsUrgents,
        },
        satisfaction: {
          note_moyenne_centre: avisGlobal[0]
            ? Math.round(avisGlobal[0].note_moyenne * 10) / 10
            : 0,
          total_avis: avisGlobal[0]?.total || 0,
        },
      },
    });
  } catch (err) {
    console.error('[getOverview]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};