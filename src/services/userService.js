// src/services/userService.js
const { db } = require('../config/firebase');

/**
 * Service de gestion des utilisateurs
 * Gère toutes les opérations CRUD sur la collection users dans Firebase
 */

// Récupérer tous les utilisateurs
exports.getAllUsers = async () => {
  const snapshot = await db.collection('users').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Récupérer un utilisateur par son ID
exports.getUserById = async id => {
  const doc = await db.collection('users').doc(id).get();
  if (!doc.exists) throw new Error(`Aucun utilisateur trouvé avec l'ID : ${id}`);
  return { id: doc.id, ...doc.data() };
};

// Récupérer un utilisateur par son UID (alias de getUserById)
exports.getUserByUID = async uid => {
  return exports.getUserById(uid);
};

// Récupérer un utilisateur par son email
exports.getUserByEmail = async email => {
  const snapshot = await db.collection('users').where('email', '==', email).get();
  if (snapshot.empty) {
    throw new Error(`Aucun utilisateur trouvé avec l'email : ${email}`);
  }
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

// Créer un nouvel utilisateur
exports.createUser = async data => {
  const newUserRef = await db.collection('users').add({ 
    ...data, 
    createdAt: new Date().toISOString() 
  });
  return newUserRef.id;
};

// Mettre à jour un utilisateur
exports.updateUser = async (id, data) => {
  await db.collection('users').doc(id).update({
    ...data,
    updatedAt: new Date().toISOString()
  });
  // Récupérer et retourner l'utilisateur mis à jour
  return exports.getUserById(id);
};

// Supprimer un utilisateur
exports.deleteUser = async id => {
  await db.collection('users').doc(id).delete();
};
