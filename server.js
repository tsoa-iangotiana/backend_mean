const express = require('express'); 
const mongoose = require('mongoose'); 
const cors = require('cors'); 


require('dotenv').config(); 
// server.js - après les imports
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express(); 
const PORT = process.env.PORT || 5000; 

// Middleware 
app.use(cors({
  origin: 'http://localhost:4200',
  allowedHeaders: ['Content-Type', 'Authorization'] // MODIFIÉ: Désactivé car on n'utilise plus les cookies
})); 
app.use(express.json()); 
// server.js - Configuration Swagger simple
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API MEAN',
      version: '1.0.0'
    }
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Connexion à MongoDB avec options
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout après 5 secondes
  socketTimeoutMS: 45000,
})
  .then(() => console.log("✅ MongoDB connecté avec succès"))
  .catch(err => {
    console.log("❌ Erreur MongoDB:", err.message);
    console.log("URI utilisée:", process.env.MONGO_URI ? "Définie" : "Non définie");
  });

// Middleware pour vérifier la connexion
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: "Base de données non connectée",
      status: mongoose.connection.readyState 
    });
  }
  next();
});

// Routes
app.use('/auth', require('./routes/userRoutes'));
app.use('/articles', require('./routes/articleRoutes')); 

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    message: 'API MEAN fonctionne',
    dbStatus: mongoose.connection.readyState === 1 ? 'Connecté' : 'Déconnecté'
  });
});

// Route pour vérifier la connexion à la BDD
app.get('/api/db-status', (req, res) => {
  const status = {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
  };
  res.json(status);
});

// Lancement serveur
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));