const { birdClient, formatBirdError } = require('./birdClient');
const { assertBirdConfig } = require('../../../config/bird');

// Canaux dont on sait lire les messages à l'unité.
const SUPPORTED_CHANNELS = ['whatsapp', 'sms'];

/**
 * Extrait le coût d'une réponse Bird.
 *
 * ⚠️ Le nom exact des champs de facturation n'a pas encore pu être vérifié sur
 * un message réellement émis. On tolère donc plusieurs formes courantes, et la
 * réponse brute de Bird est systématiquement retournée dans `raw` pour ne rien
 * perdre si le format diffère.
 *
 * @param {object} payload réponse brute de Bird
 * @returns {{amount: number|null, currencyCode: string|null, breakdown: object|null}}
 */
const extractCost = payload => {
  const source = payload?.cost || payload?.price || payload?.billing || payload || {};

  const rawAmount =
    source.amount ??
    source.total ??
    source.total_cost ??
    payload?.total_cost ??
    payload?.amount ??
    null;

  const amount = rawAmount === null || rawAmount === undefined ? null : Number(rawAmount);

  const currencyCode =
    source.currency_code || source.currency || payload?.currency_code || payload?.currency || null;

  // Détail par composant : tarif par segment, segments facturés, pays, surtaxe.
  const breakdown = source.breakdown || source.components || payload?.breakdown || null;

  return {
    amount: Number.isFinite(amount) ? amount : null,
    currencyCode,
    breakdown,
  };
};

/**
 * Lit un message envoyé et son coût de facturation.
 *
 * @param {object} params
 * @param {string} params.messageId Identifiant retourné à l'envoi
 * @param {string} [params.channel] 'whatsapp' (défaut) ou 'sms'
 * @returns {Promise<{success: boolean, message: string, data?: object}>}
 */
exports.getMessageCost = async ({ messageId, channel = 'whatsapp' }) => {
  try {
    assertBirdConfig();

    if (!messageId) {
      return { success: false, message: "L'identifiant du message est requis" };
    }

    if (!SUPPORTED_CHANNELS.includes(channel)) {
      return {
        success: false,
        message: `Canal non supporté : ${channel} (valeurs acceptées : ${SUPPORTED_CHANNELS.join(', ')})`,
      };
    }

    const { data } = await birdClient.get(`/v1/${channel}/messages/${messageId}`);
    const cost = extractCost(data);

    console.log(
      `💰 [BIRD-COST] ${channel}/${messageId} : ${cost.amount ?? 'n/a'} ${cost.currencyCode || ''}`.trim()
    );

    return {
      success: true,
      message: 'Coût du message récupéré',
      data: {
        messageId,
        channel,
        status: data?.status || null,
        destinationCountry: data?.destination_country || null,
        segments: data?.segments || null,
        cost,
        raw: data,
      },
    };
  } catch (error) {
    const formatted = formatBirdError(error, 'Échec de la récupération du coût du message');
    console.error(`❌ [BIRD-COST] ${formatted.message}`);
    return { success: false, message: formatted.message, details: formatted.details };
  }
};

/**
 * Lit le détail complet d'une vérification OTP : tentatives par canal, statut de
 * livraison, erreurs éventuelles et coûts si Bird les expose.
 *
 * C'est l'appel de diagnostic à utiliser quand un OTP n'arrive pas : il révèle
 * la cause exacte (solde insuffisant, pays non couvert, numéro invalide...).
 *
 * @param {object} params
 * @param {string} params.verificationId
 */
exports.getVerificationDetails = async ({ verificationId }) => {
  try {
    assertBirdConfig();

    if (!verificationId) {
      return { success: false, message: "L'identifiant de vérification est requis" };
    }

    const { data } = await birdClient.get(`/v1/verify/verifications/${verificationId}`);

    // Une tentative par canal essayé (whatsapp, puis sms en repli, etc.)
    const attempts = (data?.attempts || []).map(attempt => ({
      channel: attempt.channel,
      deliveryStatus: attempt.delivery_status,
      error: attempt.error || null,
      sender: attempt.sender || null,
      segments: attempt.segments || null,
      cost: extractCost(attempt),
      createdAt: attempt.created_at,
    }));

    const totalCost = attempts.reduce((sum, a) => sum + (a.cost.amount || 0), 0);
    const currencyCode = attempts.find(a => a.cost.currencyCode)?.cost.currencyCode || null;

    return {
      success: true,
      message: 'Détail de la vérification récupéré',
      data: {
        verificationId,
        status: data?.status,
        destinationCountry: data?.destination_country || null,
        to: data?.to || null,
        expiresAt: data?.expires_at || null,
        failedAttempts: data?.failed_attempts ?? null,
        attempts,
        totalCost: { amount: totalCost || null, currencyCode },
        raw: data,
      },
    };
  } catch (error) {
    const formatted = formatBirdError(error, 'Échec de la récupération de la vérification');
    console.error(`❌ [BIRD-COST] ${formatted.message}`);
    return { success: false, message: formatted.message, details: formatted.details };
  }
};
