// src/services/userService.js
const { db, admin } = require('../config/firebase');

/**
 * Service de gestion des utilisateurs
 * Gère toutes les opérations CRUD sur la collection users dans Firebase
 */

// Récupérer tous les utilisateurs
exports.getAllUsers = async () => {
  const snapshot = await db.collection('users').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Récupérer un utilisateur par son ID ou son UID Firebase (Normalisation Yakkoo Style)
exports.getUserById = async id => {
  // 1. Tenter de récupérer par l'ID du document directement
  const doc = await db.collection('users').doc(id).get();
  let rawData;
  let docId;

  if (doc.exists) {
    rawData = doc.data();
    docId = doc.id;
  } else {
    // 2. Fallback : Rechercher par le champ 'uid' (Firebase UID)
    const snapshot = await db.collection('users').where('uid', '==', id).limit(1).get();
    if (snapshot.empty) {
      throw new Error(`Aucun utilisateur trouvé avec l'ID ou UID : ${id}`);
    }
    const userDoc = snapshot.docs[0];
    rawData = userDoc.data();
    docId = userDoc.id;
  }

  // Normalisation style Yaammoo
  const uid = rawData.uid || rawData.infos?.uid || docId;
  return {
    id: docId,
    uid: uid,
    ...rawData
  };
};

// Récupérer un utilisateur par son UID (alias de getUserById)
exports.getUserByUID = async uid => {
  return exports.getUserById(uid);
};

// Récupérer un utilisateur par son email (Yaammoo style: infos.email)
exports.getUserByEmail = async email => {
  const snapshot = await db.collection('users').where('infos.email', '==', email).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const rawData = doc.data();
  const uid = rawData.uid || rawData.infos?.uid || doc.id;

  return { id: doc.id, uid, ...rawData };
};

// Créer un nouvel utilisateur
exports.createUser = async data => {
  const userId = data.uid || data.infos?.uid;

  if (userId) {
    // Si on a un UID, on l'utilise comme ID de document pour la cohérence
    await db.collection('users').doc(userId).set({
      ...data,
      createdAt: new Date().toISOString()
    });
    return userId;
  }

  // Sinon generateur auto-id
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

  // Note: la gestion des tokens push est maintenant gérée via les endpoints dédiés
  // POST /api/user/push-token/add et /remove (avec deviceId). On ignore ici tout champ
  // fcmToken/tokenType qui viendrait via updateUser pour éviter les conflits.
  delete updateData.fcmToken;
  delete updateData.tokenType;

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

// ===== Push tokens (multi-device) =====

const findUserDoc = async (id) => {
  let snap = await db.collection('users').doc(id).get();
  if (snap.exists) return snap;
  const q = await db.collection('users').where('uid', '==', id).get();
  if (q.empty) return null;
  return q.docs[0];
};

// Upsert d'un token push lié à un device. Évite les doublons par deviceId.
exports.addPushToken = async (userId, { token, platform, deviceId }) => {
  if (!token || !platform || !deviceId) {
    throw new Error('token, platform et deviceId sont requis');
  }
  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('platform doit être "ios" ou "android"');
  }

  const userDoc = await findUserDoc(userId);
  if (!userDoc) throw new Error(`Utilisateur ${userId} introuvable`);

  const data = userDoc.data();
  const existing = Array.isArray(data.pushTokens) ? data.pushTokens : [];

  // Retire toute entrée existante avec le même deviceId (refresh propre)
  const filtered = existing.filter(e => e.deviceId !== deviceId);
  filtered.push({
    token,
    platform,
    deviceId,
    lastSeen: new Date().toISOString(),
  });

  await userDoc.ref.update({
    pushTokens: filtered,
    updatedAt: new Date().toISOString(),
  });

  console.log(`✅ [PUSH-TOKEN] add ${platform} pour user=${userId} device=${deviceId} (total=${filtered.length})`);
  return { count: filtered.length };
};

// Supprime le token push correspondant à un device (logout).
exports.removePushToken = async (userId, { deviceId }) => {
  if (!deviceId) throw new Error('deviceId requis');

  const userDoc = await findUserDoc(userId);
  if (!userDoc) throw new Error(`Utilisateur ${userId} introuvable`);

  const data = userDoc.data();
  const existing = Array.isArray(data.pushTokens) ? data.pushTokens : [];
  const filtered = existing.filter(e => e.deviceId !== deviceId);

  if (filtered.length === existing.length) {
    console.log(`ℹ️ [PUSH-TOKEN] remove: aucun token trouvé pour device=${deviceId}`);
    return { removed: 0, count: existing.length };
  }

  await userDoc.ref.update({
    pushTokens: filtered,
    updatedAt: new Date().toISOString(),
  });

  console.log(`🗑️ [PUSH-TOKEN] remove device=${deviceId} pour user=${userId} (reste=${filtered.length})`);
  return { removed: existing.length - filtered.length, count: filtered.length };
};

// Helper: agrège les tokens d'un user à partir de pushTokens (+ fallback legacy fcmTokens/apnsTokens).
exports.collectUserTokens = (userData) => {
  const fcm = [];
  const apns = [];

  // Source principale: pushTokens (nouveau format)
  if (Array.isArray(userData.pushTokens)) {
    userData.pushTokens.forEach(e => {
      if (!e || !e.token) return;
      if (e.platform === 'ios') apns.push(e.token);
      else if (e.platform === 'android') fcm.push(e.token);
    });
  }

  // Fallback legacy pour les users pas encore migrés
  if (Array.isArray(userData.fcmTokens)) {
    userData.fcmTokens.forEach(t => t && !fcm.includes(t) && fcm.push(t));
  } else if (userData.fcmToken && userData.tokenType !== 'ios') {
    if (!fcm.includes(userData.fcmToken)) fcm.push(userData.fcmToken);
  }
  if (Array.isArray(userData.apnsTokens)) {
    userData.apnsTokens.forEach(t => t && !apns.includes(t) && apns.push(t));
  }

  return { fcm, apns };
};

// Supprimer un utilisateur
exports.deleteUser = async id => {
  await db.collection('users').doc(id).delete();
};

// Suppression complète du compte utilisateur (RGPD / Apple Guideline 5.1.1(v))
// Supprime : compte Firebase Auth + document users + toutes les données liées
exports.deleteUserAccount = async uid => {
  if (!uid) throw new Error('UID requis pour la suppression');

  console.log(`🗑️  [DELETE-ACCOUNT] Début de la suppression pour UID: ${uid}`);

  const collectionsLiees = [
    { name: 'plan_activation', field: 'userId' },
    { name: 'transactions', field: 'userId' },
    { name: 'notification', field: 'userId' },
    { name: 'subscription_errors', field: 'userId' },
    { name: 'error_logs', field: 'userId' },
    { name: 'netflix_credentials', field: 'userId' },
  ];

  for (const { name, field } of collectionsLiees) {
    try {
      const snapshot = await db.collection(name).where(field, '==', uid).get();
      if (snapshot.empty) continue;

      const batch = db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log(`✅ [DELETE-ACCOUNT] ${snapshot.size} doc(s) supprimé(s) dans ${name}`);
    } catch (err) {
      console.warn(`⚠️  [DELETE-ACCOUNT] Erreur sur ${name}: ${err.message}`);
    }
  }

  // Supprimer le document utilisateur (par ID doc OU par champ uid)
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      await db.collection('users').doc(uid).delete();
      console.log(`✅ [DELETE-ACCOUNT] Document users/${uid} supprimé`);
    } else {
      const snap = await db.collection('users').where('uid', '==', uid).get();
      const batch = db.batch();
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      console.log(`✅ [DELETE-ACCOUNT] ${snap.size} doc(s) users supprimé(s) via champ uid`);
    }
  } catch (err) {
    console.warn(`⚠️  [DELETE-ACCOUNT] Erreur suppression users: ${err.message}`);
  }

  // Supprimer le compte Firebase Auth
  try {
    await admin.auth().deleteUser(uid);
    console.log(`✅ [DELETE-ACCOUNT] Compte Firebase Auth supprimé: ${uid}`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.warn(`ℹ️  [DELETE-ACCOUNT] Firebase Auth déjà absent pour ${uid}`);
    } else {
      throw new Error(`Échec suppression Firebase Auth: ${err.message}`);
    }
  }

  console.log(`🎉 [DELETE-ACCOUNT] Suppression complète terminée pour ${uid}`);
  return { uid, deletedAt: new Date().toISOString() };
};
