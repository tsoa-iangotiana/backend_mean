// test-env.js
require('dotenv').config();
console.log('=== TEST VARIABLES ENVIRONNEMENT ===');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Définie ✅' : 'NON DÉFINIE ❌');
console.log('PORT:', process.env.PORT || '5000 (défaut)');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Défini ✅' : 'NON DÉFINI ❌');

if (process.env.MONGO_URI) {
  console.log('\nURI MongoDB trouvée, test de connexion...');
  const mongoose = require('mongoose');
  
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
  })
  .then(() => {
    console.log('✅ Connexion MongoDB réussie!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Échec connexion:', err.message);
    process.exit(1);
  });
}