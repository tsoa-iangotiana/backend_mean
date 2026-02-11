// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = (roles = []) => {
  return async (req, res, next) => {
    // Convertir roles en tableau si c'est une string
    if (typeof roles === 'string') {
      roles = [roles];
    }
    
    // MODIFIÉ: Lire le token depuis l'en-tête Authorization
    let token;
    
    // Vérifier si le token est dans l'en-tête Authorization
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]; // Extraire le token après "Bearer "
    }
    
    // Aussi vérifier le token dans la query string (optionnel)
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    console.log('🔍 En-tête Authorization:', authHeader);
    console.log('🔍 Token extrait:', token ? 'Présent' : 'Absent');

    if (!token) {
      console.error('❌ Token manquant dans la requête');
      return res.status(401).json({ 
        success: false,
        message: 'Accès non autorisé. Token manquant.' 
      });
    }

    try {
      // Vérifier et décoder le token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token décodé:', decoded);
      
      // Vérifier si le token contient bien l'ID utilisateur
      if (!decoded.userId) {
        console.error('❌ Token sans userId:', decoded);
        return res.status(401).json({ 
          success: false,
          message: 'Token invalide' 
        });
      }
      
      // Récupérer l'utilisateur depuis la base de données
      const user = await User.findById(decoded.userId).select('-password');
      
      // Vérifier si l'utilisateur existe
      if (!user) {
        console.error('❌ Utilisateur non trouvé pour ID:', decoded.userId);
        return res.status(401).json({ 
          success: false,
          message: 'Utilisateur non trouvé' 
        });
      }
      
      // Vérifier si le compte est actif
      if (user.active === false) {
        return res.status(403).json({ 
          success: false,
          message: 'Compte désactivé' 
        });
      }

      // Vérifier le rôle si nécessaire
      if (roles.length > 0 && !roles.includes(user.role)) {
        console.log(`❌ Rôle ${user.role} non autorisé. Rôles acceptés: ${roles}`);
        return res.status(403).json({ 
          success: false,
          message: 'Accès refusé. Permissions insuffisantes.' 
        });
      }

      // Attacher l'utilisateur à la requête
      req.user = user;
      console.log('✅ Utilisateur authentifié:', user._id, user.email, `Rôle: ${user.role}`);
      
      next();
    } catch (err) {
      console.error('❌ Erreur vérification token:', err.name, err.message);
      
      // Différencier les types d'erreur
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: 'Session expirée. Veuillez vous reconnecter.' 
        });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false,
          message: 'Token invalide' 
        });
      } else if (err.name === 'SyntaxError') {
        return res.status(401).json({ 
          success: false,
          message: 'Token mal formé' 
        });
      }
      
      // Erreur générale
      return res.status(401).json({ 
        success: false,
        message: 'Erreur d\'authentification' 
      });
    }
  };
};

module.exports = authMiddleware;