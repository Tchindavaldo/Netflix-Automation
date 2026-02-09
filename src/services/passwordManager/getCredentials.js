const { db } = require('../../config/firebase');

/**
 * Récupère les identifiants Netflix de manière flexible
 * @param {object} filters - Filtres de recherche (ex: { user_id: '123' }, { id: 'abc' })
 * @param {number} limit - Nombre maximum de résultats (défaut: 1)
 * @returns {Promise<object|Array|null>} - Retourne un objet si limit=1, un tableau sinon
 */
const getCredentials = async (filters = {}, limit = 1) => {
  let query = db.collection('netflix_credentials');
  let isById = false;

  // Cas spécial : recherche par ID de document
  if (filters.id) {
    const doc = await db.collection('netflix_credentials').doc(filters.id).get();
    if (!doc.exists) {
      if (limit === 1) throw new Error(`Aucun identifiant trouvé avec l'ID : ${filters.id}`);
      return [];
    }
    const data = { id: doc.id, ...doc.data(), password_hash: undefined };
    return limit === 1 ? data : [data];
  }

  // Application des filtres dynamiques
  if (filters && Object.keys(filters).length > 0) {
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && key !== 'id') {
        query = query.where(key, '==', filters[key]);
      }
    });
  }

  // Application de la limite
  if (limit) {
    query = query.limit(limit);
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    if (limit === 1) {
      return null;
    }
    return [];
  }

  const results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    password_hash: undefined // Sécurité
  }));

  // Si on cherche un seul résultat, on retourne l'objet directement
  if (limit === 1) {
    return results[0];
  }

  return results;
};

module.exports = getCredentials;
