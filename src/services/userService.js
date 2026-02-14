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
    console.log(`🔔 [USER-SERVICE] Mise à jour FCM pour: ${id}`);
    console.log(`🎫 [USER-SERVICE] Nouveau token: ${data.fcmToken.substring(0, 30)}...`);
  }

  const userRef = db.collection('users').doc(id);
  const doc = await userRef.get();

  let userDoc;
  let docId;

  if (doc.exists) {
    // console.log(`✅ Utilisateur trouvé par ID de document: ${id}`);
    userDoc = doc;
    docId = id;
  } else {
    // console.log(`🔍 Utilisateur non trouvé par ID de document, recherche par champ 'uid': ${id}`);
    const snapshot = await db.collection('users').where('uid', '==', id).get();
    
    if (snapshot.empty) {
      console.warn(`❌ Aucun utilisateur trouvé avec l'ID ou UID: ${id}`);
      throw new Error(`Aucun utilisateur trouvé avec l'ID ou UID : ${id}`);
    }

    userDoc = snapshot.docs[0];
    docId = userDoc.id;
    console.log(`✅ [USER-SERVICE] Utilisateur trouvé par UID: ${id} (Document ID: ${docId})`);
  }

  const userData = userDoc.data();
  const updateData = {
    ...data,
    updatedAt: new Date().toISOString()
  };

  // Gérer le token FCM comme un tableau
  if (data.fcmToken) {
    let fcmTokens = userData.fcmTokens || [];
    
    // Migration : Si fcmTokens n'existe pas mais fcmToken (singulier) existe, 
    // on initialise le tableau avec l'ancien token
    if (!userData.fcmTokens && userData.fcmToken) {
      fcmTokens = [userData.fcmToken];
    }

    // Si par erreur fcmTokens est stocké comme une chaîne, on la convertit
    if (!Array.isArray(fcmTokens)) {
      fcmTokens = [fcmTokens];
    }

    // Ajouter le nouveau token s'il n'est pas déjà présent
    console.log(`📜 [USER-SERVICE] Tokens déjà présents:`, fcmTokens.length);
    
    if (!fcmTokens.includes(data.fcmToken)) {
      fcmTokens.push(data.fcmToken);
      console.log(`➕ [USER-SERVICE] Nouveau token ajouté. Total: ${fcmTokens.length}`);
    } else {
      console.log(`ℹ️ [USER-SERVICE] Le token existe déjà dans la liste.`);
    }

    console.log(`📝 [USER-SERVICE] Liste finale des tokens:`, fcmTokens);
    updateData.fcmTokens = fcmTokens;
    // On garde aussi fcmToken (singulier) pour la compatibilité
    updateData.fcmToken = data.fcmToken;
  }

  await db.collection('users').doc(docId).update(updateData);
  
  if (data.fcmToken) {
    // console.log(`🚀 Tokens FCM mis à jour avec succès pour l'utilisateur ${docId}`);
  }

  return { id: docId, ...userData, ...updateData };
};

exports.removeInvalidFcmTokens = async (tokens) => {
  if (!tokens || tokens.length === 0) return;

  // console.log(`🧹 [CLEANUP] Début du nettoyage pour ${tokens.length} token(s) invalide(s)`);
  
  for (const token of tokens) {
    try {
      // Rechercher les utilisateurs qui ont ce token
      const snapshot = await db.collection('users').where('fcmTokens', 'array-contains', token).get();
      
      const batch = db.batch();
      snapshot.forEach(doc => {
        const userData = doc.data();
        const updatedTokens = (userData.fcmTokens || []).filter(t => t !== token);
        
        const updateData = { fcmTokens: updatedTokens };
        // Si c'était aussi le token principal, on le vide
        if (userData.fcmToken === token) {
          updateData.fcmToken = updatedTokens.length > 0 ? updatedTokens[0] : null;
        }
        
        batch.update(doc.ref, updateData);
      });
      
      await batch.commit();
      
      // Gérer aussi le cas où le token est uniquement dans le champ simple 'fcmToken'
      const singleSnapshot = await db.collection('users').where('fcmToken', '==', token).get();
      const singleBatch = db.batch();
      singleSnapshot.forEach(doc => {
        singleBatch.update(doc.ref, { fcmToken: null });
      });
      await singleBatch.commit();

    } catch (e) {
      console.error(`❌ [CLEANUP] Erreur pour le token ${token.substring(0, 10)}... :`, e.message);
    }
  }
};

// Supprimer un utilisateur
exports.deleteUser = async id => {
  await db.collection('users').doc(id).delete();
};
