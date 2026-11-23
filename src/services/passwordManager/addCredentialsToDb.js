const { db } = require('../../config/firebase');

/**
 * Ajoute un document d'identifiants dans la base de données (couche DB uniquement)
 * @param {object} credentialsData - Les données complètes à insérer
 * @returns {object} - L'objet créé avec son ID
 */
const addCredentialsToDb = async (credentialsData) => {
  const docRef = await db.collection('netflix_credentials').add(credentialsData);
  
  return {
    id: docRef.id,
    ...credentialsData,
    password_hash: undefined
  };
};

module.exports = addCredentialsToDb;
