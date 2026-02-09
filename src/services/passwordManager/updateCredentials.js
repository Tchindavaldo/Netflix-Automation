const { db } = require('../../config/firebase');
const bcrypt = require('bcryptjs');
const getCredentials = require('./getCredentials');

/**
 * Met à jour les identifiants Netflix
 * @param {string} id - ID du document
 * @param {object} updateData - Données à mettre à jour
 */
const updateCredentials = async (id, updateData) => {
  // Vérifier l'existence
  const existing = await getCredentials({ id }, 1);
  if (!existing) {
    throw new Error(`Aucun identifiant trouvé avec l'ID : ${id}`);
  }

  const dataToUpdate = { ...updateData };

  // Si le mot de passe est modifié, le hasher
  if (updateData.password_text) {
    dataToUpdate.password_hash = await bcrypt.hash(updateData.password_text, 10);
  }

  dataToUpdate.updated_at = new Date().toISOString();

  await db.collection('netflix_credentials').doc(id).update(dataToUpdate);

  // Retourner le document mis à jour via le service générique
  return getCredentials({ id }, 1);
};

module.exports = updateCredentials;
