const { db } = require('../../../../config/firebase');
const { birdClient, formatBirdError } = require('../birdClient');
const { assertBirdConfig } = require('../../../../config/bird');
const { normalizePhoneNumber } = require('../../../../utils/validator/validatePhoneNumber');

const OTP_COLLECTION = 'whatsappOtp';

const otpDocId = phoneNumber => phoneNumber.replace('+', '');

/**
 * Vérifie un code OTP auprès de la Verify API de Bird.
 *
 * La vérification s'appuie sur le même identifiant que l'envoi (numéro ou
 * e-mail) : aucun identifiant de vérification n'est à conserver côté MoobilPay.
 * Bird contrôle le code, son expiration et le nombre de tentatives.
 *
 * @param {object} params
 * @param {string} params.code
 * @param {string} [params.phoneNumber]
 * @param {string} [params.email]
 * @returns {Promise<{success: boolean, message: string, data?: object}>}
 */
exports.verifyWhatsappOtp = async ({ phoneNumber, email, code }) => {
  try {
    assertBirdConfig();

    if (!code) {
      return { success: false, message: 'Le code OTP est requis' };
    }

    if (!phoneNumber && !email) {
      return { success: false, message: 'Un numéro de téléphone ou une adresse e-mail est requis' };
    }

    const to = {};
    let recipient = null;

    if (phoneNumber) {
      recipient = normalizePhoneNumber(phoneNumber);
      if (!recipient) {
        return { success: false, message: `Numéro de téléphone invalide : ${phoneNumber}` };
      }
      to.phone_number = recipient;
    }

    if (email) {
      to.email_address = email;
    }

    const { data } = await birdClient.post('/v1/verify/verifications/check', {
      to,
      code: String(code),
    });

    const verified = data?.status === 'verified' || data?.verified === true;

    // Une vérification aboutie consomme la demande : on retire la trace locale.
    if (verified && recipient) {
      await db
        .collection(OTP_COLLECTION)
        .doc(otpDocId(recipient))
        .delete()
        .catch(err => console.warn(`⚠️ [BIRD-OTP] Nettoyage impossible : ${err.message}`));
    }

    console.log(`${verified ? '✅' : '⚠️'} [BIRD-OTP] Vérification ${recipient || email} : ${data?.status}`);

    return {
      success: verified,
      message: verified ? 'Code OTP validé' : 'Code OTP invalide ou expiré',
      data: { status: data?.status, phoneNumber: recipient, email: email || null },
    };
  } catch (error) {
    // Bird répond en 4xx pour un mauvais code : ce n'est pas une erreur serveur,
    // mais un échec de vérification métier.
    const status = error.response?.status;
    if (status === 400 || status === 401 || status === 404 || status === 422) {
      const birdStatus = error.response?.data?.status;
      console.warn(`⚠️ [BIRD-OTP] Vérification refusée (${status}) : ${birdStatus || 'code invalide'}`);
      return {
        success: false,
        message: 'Code OTP invalide ou expiré',
        data: { status: birdStatus || 'failed' },
      };
    }

    const formatted = formatBirdError(error, 'Échec de la vérification du code OTP');
    console.error(`❌ [BIRD-OTP] ${formatted.message}`);
    return { success: false, message: formatted.message, details: formatted.details };
  }
};
