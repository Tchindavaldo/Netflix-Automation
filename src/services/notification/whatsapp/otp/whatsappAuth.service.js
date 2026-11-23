const { db, admin } = require('../../../../config/firebase');
const { sendWhatsappOtp } = require('./sendOtp.service');
const { verifyWhatsappOtp } = require('./verifyOtp.service');
const { getVerificationDetails } = require('../getMessageCost.service');
const { recordVerificationSent, recordVerificationCost } = require('../birdCost.service');
const { normalizePhoneNumber } = require('../../../../utils/validator/validatePhoneNumber');

const USER_COLLECTION = 'users';
const OTP_COLLECTION = 'whatsappOtp';

/**
 * Délai minimum entre deux demandes pour un même numéro.
 *
 * Chaque envoi est facturé par Bird : sans ce verrou, un utilisateur qui clique
 * plusieurs fois sur « renvoyer » déclenche autant d'envois payants, et chaque
 * nouvelle demande rend la précédente orpheline (elle expire sans être validée,
 * mais reste facturée).
 */
const RESEND_COOLDOWN_SECONDS = 60;

/** UID Firebase dérivé du numéro : stable et rejouable sans table de correspondance. */
const uidFromPhone = phoneNumber => `wa_${phoneNumber.replace('+', '')}`;

/**
 * Secondes restantes avant qu'un nouvel envoi soit autorisé pour ce numéro.
 *
 * S'appuie sur `createdAt` de la dernière demande. En cas d'échec de lecture, on
 * autorise l'envoi : mieux vaut un SMS de trop qu'un utilisateur bloqué.
 *
 * @returns {Promise<number>} 0 si l'envoi est autorisé
 */
const getCooldownRemaining = async phoneNumber => {
  try {
    const doc = await db.collection(OTP_COLLECTION).doc(phoneNumber.replace('+', '')).get();
    if (!doc.exists) return 0;

    const createdAt = doc.data().createdAt;
    if (!createdAt) return 0;

    const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
    const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
    return remaining > 0 ? remaining : 0;
  } catch (error) {
    console.warn(`⚠️ [WA-AUTH] Contrôle du délai impossible : ${error.message}`);
    return 0;
  }
};

/** Recherche un utilisateur par son numéro WhatsApp. */
const findUserByPhone = async phoneNumber => {
  const snapshot = await db
    .collection(USER_COLLECTION)
    .where('infos.phoneNumber', '==', phoneNumber)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

/**
 * Étape 1 — Demande d'un code de connexion par WhatsApp.
 *
 * Ne révèle pas si le numéro est déjà inscrit : la réponse est identique dans
 * les deux cas, pour ne pas transformer cet endpoint en outil d'énumération.
 *
 * @param {object} params
 * @param {string} params.phoneNumber
 */
exports.requestWhatsappAuth = async ({ phoneNumber }) => {
  const recipient = normalizePhoneNumber(phoneNumber);
  if (!recipient) {
    return { success: false, message: `Numéro de téléphone invalide : ${phoneNumber}` };
  }

  // Contrôle avant l'appel à Bird : passé ce point, l'envoi est facturé.
  const retryAfter = await getCooldownRemaining(recipient);
  if (retryAfter > 0) {
    return {
      success: false,
      code: 'cooldown',
      message: `Veuillez patienter ${retryAfter} seconde${retryAfter > 1 ? 's' : ''} avant de demander un nouveau code`,
      data: { retryAfter },
    };
  }

  const sent = await sendWhatsappOtp({ phoneNumber: recipient });
  if (!sent.success) return sent;

  // Trace du coût dès l'envoi : une demande abandonnée est facturée par Bird,
  // elle doit donc rester visible même si le code n'est jamais saisi.
  await recordVerificationSent({
    verificationId: sent.data.verificationId,
    phoneNumber: recipient,
  });

  return {
    success: true,
    message: 'Code de vérification envoyé',
    data: {
      verificationId: sent.data.verificationId,
      phoneNumber: recipient,
      expiresIn: 600,
    },
  };
};

/**
 * Étape 2 — Validation du code, puis connexion ou inscription.
 *
 * Enchaînement : Bird valide le code → on relit la vérification pour connaître
 * le coût réel et on le stocke → on crée (ou retrouve) l'utilisateur → on émet
 * un custom token Firebase.
 *
 * Le custom token est à usage unique : le frontend l'échange via
 * `signInWithCustomToken`, ce qui lui donne un refresh token persistant. La
 * session survit donc bien au-delà de six mois sans nouvelle saisie de code.
 *
 * @param {object} params
 * @param {string} params.phoneNumber
 * @param {string} params.code
 * @param {object} [params.profile] Champs de profil optionnels à l'inscription
 */
exports.verifyWhatsappAuth = async ({ phoneNumber, code, profile = {} }) => {
  const recipient = normalizePhoneNumber(phoneNumber);
  if (!recipient) {
    return { success: false, message: `Numéro de téléphone invalide : ${phoneNumber}` };
  }
  if (!code) {
    return { success: false, message: 'Le code de vérification est requis' };
  }

  // On mémorise l'id avant vérification : une vérification réussie supprime la
  // trace locale, et l'id reste nécessaire pour relire le coût.
  let verificationId = null;
  try {
    const otpDoc = await db.collection(OTP_COLLECTION).doc(recipient.replace('+', '')).get();
    if (otpDoc.exists) verificationId = otpDoc.data().verificationId;
  } catch (error) {
    console.warn(`⚠️ [WA-AUTH] Lecture de la demande impossible : ${error.message}`);
  }

  const verified = await verifyWhatsappOtp({ phoneNumber: recipient, code });
  if (!verified.success) {
    return {
      success: false,
      message: verified.message,
      data: {
        reason: verified.data?.reason || null,
        attemptsRemaining: verified.data?.attemptsRemaining ?? null,
      },
    };
  }

  verificationId = verificationId || verified.data?.verificationId;

  // Coût réel : disponible seulement une fois les tentatives résolues par Bird.
  let cost = { totalCost: null, currencyCode: null };
  if (verificationId) {
    const details = await getVerificationDetails({ verificationId });
    if (details.success) {
      cost = await recordVerificationCost({
        verificationId,
        verification: details.data.raw,
        verified: true,
      });
    }
  }

  const uid = uidFromPhone(recipient);
  const now = new Date().toISOString();

  // Connexion si le numéro est connu, inscription sinon.
  let user = await findUserByPhone(recipient);
  const isNewUser = !user;

  if (isNewUser) {
    // Compte Firebase Auth : indispensable pour que `authUser` accepte ensuite
    // les tokens issus de ce parcours.
    try {
      await admin.auth().createUser({ uid, phoneNumber: recipient });
    } catch (error) {
      // Le compte Auth peut survivre à la suppression du document Firestore.
      if (error.code !== 'auth/uid-already-exists' && error.code !== 'auth/phone-number-already-exists') {
        console.error(`❌ [WA-AUTH] Création Firebase Auth échouée : ${error.message}`);
        return { success: false, message: "Échec de la création du compte" };
      }
    }

    const userData = {
      uid,
      infos: {
        uid,
        phoneNumber: recipient,
        phoneVerified: true,
        authProvider: 'whatsapp',
        name: profile.name || null,
        email: profile.email || null,
      },
      createdAt: now,
      lastLoginAt: now,
    };

    await db.collection(USER_COLLECTION).doc(uid).set(userData);
    user = { id: uid, ...userData };
    console.log(`✅ [WA-AUTH] Nouvel utilisateur ${uid} (${recipient})`);
  } else {
    await db
      .collection(USER_COLLECTION)
      .doc(user.id)
      .update({ lastLoginAt: now })
      .catch(err => console.warn(`⚠️ [WA-AUTH] Mise à jour lastLoginAt : ${err.message}`));
    user.lastLoginAt = now;
    console.log(`✅ [WA-AUTH] Connexion ${user.id} (${recipient})`);
  }

  // `user.uid` d'abord : un compte préexistant peut avoir un uid d'une autre origine.
  const authUid = user.uid || user.infos?.uid || uid;

  let customToken;
  try {
    customToken = await admin.auth().createCustomToken(authUid, { authProvider: 'whatsapp' });
  } catch (error) {
    console.error(`❌ [WA-AUTH] Génération du token échouée : ${error.message}`);
    return { success: false, message: "Compte validé mais génération du token impossible" };
  }

  return {
    success: true,
    message: isNewUser ? 'Compte créé' : 'Connexion réussie',
    data: {
      customToken,
      isNewUser,
      user: {
        id: user.id,
        uid: authUid,
        phoneNumber: recipient,
        name: user.infos?.name || null,
        email: user.infos?.email || null,
      },
      cost,
    },
  };
};
