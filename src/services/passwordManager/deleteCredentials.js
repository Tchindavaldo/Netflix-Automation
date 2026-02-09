const getCredentials = require('./getCredentials');
const { db } = require('../../config/firebase');

/**
 * Supprime les identifiants Netflix
 * @param {string} id - ID du document
 */
const deleteCredentials = async (id) => {
  const existing = await getCredentials({ id }, 1);
  if (!existing) {
    throw new Error(`Aucun identifiant trouvé avec l'ID : ${id}`);
  }

  await db.collection('netflix_credentials').doc(id).delete();
  return { id, deleted: true };
};

module.exports = deleteCredentials;
