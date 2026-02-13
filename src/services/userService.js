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
  if (data.fcmToken) {
    console.log(`🔔 Mise à jour du token FCM demandée pour l'identifiant: ${id}`);
    console.log(`🎫 Token: ${data.fcmToken.substring(0, 20)}...`);
  }

  const userRef = db.collection('users').doc(id);
  const doc = await userRef.get();

  if (doc.exists) {
    console.log(`✅ Utilisateur trouvé par ID de document: ${id}`);
    await userRef.update({
      ...data,
      updatedAt: new Date().toISOString()
    });
    if (data.fcmToken) console.log(`🚀 Token FCM mis à jour avec succès pour le document ${id}`);
    return { id: doc.id, ...doc.data(), ...data };
  } else {
    console.log(`🔍 Utilisateur non trouvé par ID de document, recherche par champ 'uid': ${id}`);
    const snapshot = await db.collection('users').where('uid', '==', id).get();
    
    if (snapshot.empty) {
      console.warn(`❌ Aucun utilisateur trouvé avec l'ID ou UID: ${id}`);
      throw new Error(`Aucun utilisateur trouvé avec l'ID ou UID : ${id}`);
    }

    const userDoc = snapshot.docs[0];
    console.log(`✅ Utilisateur trouvé par UID: ${id} (Document ID: ${userDoc.id})`);
    await userDoc.ref.update({
      ...data,
      updatedAt: new Date().toISOString()
    });
    if (data.fcmToken) console.log(`🚀 Token FCM mis à jour avec succès pour l'UID ${id}`);
    return { id: userDoc.id, ...userDoc.data(), ...data };
  }
};

// Supprimer un utilisateur
exports.deleteUser = async id => {
  await db.collection('users').doc(id).delete();
};
