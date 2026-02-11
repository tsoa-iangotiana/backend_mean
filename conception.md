BOX
- _id
- numero
- surface
- prix_loyer
- libre: boolean

BOX_HISTORIQUE
- _id
- box        // référence BOX
- boutique   // référence BOUTIQUE
- date_debut
- date_fin

BOUTIQUE
- _id
- nom
- description
- box
- responsable
- active
- categories[]    // catégories autorisées pour cette boutique
- note_moyenne


CATEGORIE
- _id
- nom
- valide        // validation admin


PRODUIT
- _id
- nom
- description
- prix
- unite
- stock
- images[]
- categorie
- boutique
- actif
- note_moyenne
- createdAt

PROMOTION
- _id
- produits[]
- reduction        // pourcentage
- date_debut
- date_fin



PANIER
- _id
- utilisateur
- items[
    {
      produit,        // référence PRODUIT
      quantite,
      prix_unitaire   // prix actuel au moment de l’ajout dans le panier
    }
  ]
- total
- locked: boolean
- updatedAt
- createdAt

COMMANDE
- _id
- utilisateur
- boutique
- items[
    {
      produit,
      prix_unitaire,
      quantite
    }
  ]
- montant_total
- statut:  PAYEE | ANNULEE
- createdAt

PAIEMENT
- _id
- boutique       // référence BOUTIQUE
- montant
- date_paiement
- date_fin       // période du loyer
    
FAVORIS
- _id
- utilisateur
- produits[]
- boutiques[]

AVIS
- _id
- utilisateur
- cible_type: PRODUIT | BOUTIQUE
- cible_id
- note
- commentaire
- createdAt

TICKET
- _id
- boutique
- sujet
- description
- statut: OUVERT | EN_COURS | RESOLU
- priorite
- createdAt
- resolvedAt
