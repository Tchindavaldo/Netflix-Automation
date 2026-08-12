const { birdClient, formatBirdError } = require('../whatsapp/birdClient');
const { assertBirdConfig } = require('../../../config/bird');
const { normalizePhoneNumber } = require('../../../utils/validator/validatePhoneNumber');
const { recordSmsSent } = require('../whatsapp/birdCost.service');

/**
 * Envoi de SMS via Bird.
 *
 * ⚠️ Le workspace n'a **aucun expéditeur SMS propre** (`/v1/sms/senders` est
 * vide) : un envoi en texte libre est donc rejeté en 422
 * (« No eligible sender is available »). Seul l'envoi **par template** passe,
 * car Bird sélectionne alors lui-même l'expéditeur partagé (marque `Notifly`).
 *
 * Le texte libre reste implémenté pour le jour où un expéditeur sera enregistré ;
 * il exige un `from` explicite.
 *
 * Rappel : `202 Accepted` ne signifie pas « livré ». Le coût vaut `null` à
 * l'acceptation et n'est renseigné qu'après tarification — il faut relire le
 * message pour le connaître.
 *
 * ⚠️ Les opérateurs camerounais filtrent certains contenus : un message peut
 * finir `failed` avec `content_rejected` **tout en étant facturé**. Toujours
 * relire le statut via `getSmsStatus` plutôt que se fier à l'acceptation.
 */

const CATEGORIES = ['transactional', 'marketing', 'authentication', 'service'];

/** Normalise la réponse Bird, identique pour un envoi libre ou par template. */
const formatMessage = data => ({
  messageId: data.id,
  status: data.status,
  to: data.to,
  from: data.from,
  text: data.text,
  category: data.category,
  segments: data.segments || null,
  // `null` à l'acceptation : la tarification est postérieure.
  cost: data.cost
    ? { amount: Number(data.cost.amount), currencyCode: data.cost.currency_code }
    : null,
  createdAt: data.created_at,
});

/**
 * Envoie un SMS à partir d'un template Bird.
 *
 * Le template fournit le corps, la catégorie **et** l'expéditeur : `text`,
 * `category` et `from` sont refusés à ses côtés.
 *
 * Templates utiles pour MoobilPay (catalogue complet via `listSmsTemplates`) :
 * - `bird_payment_confirmation` — amount, currency, date
 * - `bird_renewal_reminder`     — date, amount, currency
 * - `bird_order_confirmation`   — ref, amount, currency
 * - `bird_signin_alert`         — date_time
 *
 * @param {object} params
 * @param {string} params.to Numéro destinataire (local ou E.164)
 * @param {string} params.template Référence du template, ex. 'bird_payment_confirmation'
 * @param {object} [params.parameters] Valeurs des variables du template
 * @param {string} [params.language] Langue (défaut : anglais)
 * @param {object} [params.metadata] Contexte renvoyé sur chaque webhook (max 2 Ko)
 */
exports.sendSmsTemplate = async ({ to, template, parameters = {}, language, metadata }) => {
  try {
    assertBirdConfig();

    if (!template) {
      return { success: false, message: 'La référence du template est requise' };
    }

    const recipient = normalizePhoneNumber(to);
    if (!recipient) {
      return { success: false, message: `Numéro de téléphone invalide : ${to}` };
    }

    const payload = {
      to: recipient,
      template: { name: template, parameters },
    };
    if (language) payload.template.language = language;
    if (metadata) payload.metadata = metadata;

    const { data } = await birdClient.post('/v1/sms/messages', payload);

    console.log(`📩 [BIRD-SMS] ${template} → ${recipient} (${data.id}) : ${data.status}`);

    // Le SMS est facturé : il doit apparaître dans le récapitulatif des coûts
    // au même titre que les OTP.
    await recordSmsSent({ messageId: data.id, message: { ...data, template } });

    return { success: true, message: 'SMS accepté par Bird', data: formatMessage(data) };
  } catch (error) {
    const formatted = formatBirdError(error, "Échec de l'envoi du SMS");
    console.error(`❌ [BIRD-SMS] ${formatted.message}`);
    return { success: false, message: formatted.message, details: formatted.details };
  }
};

/**
 * Envoie un SMS en texte libre.
 *
 * ⚠️ Nécessite un expéditeur (`from`) enregistré sur le workspace. En l'absence
 * d'expéditeur, Bird rejette la requête — utiliser `sendSmsTemplate` à la place.
 *
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.text Corps du message (12 segments maximum)
 * @param {string} params.category transactional | marketing | authentication | service
 * @param {string} params.from Expéditeur : numéro E.164 possédé, ID alphanumérique (1–11 car.) ou short code
 */
exports.sendSmsText = async ({ to, text, category = 'transactional', from, metadata }) => {
  try {
    assertBirdConfig();

    if (!text) return { success: false, message: 'Le contenu du message est requis' };

    if (!CATEGORIES.includes(category)) {
      return {
        success: false,
        message: `Catégorie invalide : ${category} (attendu : ${CATEGORIES.join(', ')})`,
      };
    }

    if (!from) {
      return {
        success: false,
        message:
          "Un expéditeur ('from') est requis pour un SMS en texte libre. " +
          "Aucun expéditeur n'est enregistré sur ce workspace : utilisez un template.",
      };
    }

    const recipient = normalizePhoneNumber(to);
    if (!recipient) {
      return { success: false, message: `Numéro de téléphone invalide : ${to}` };
    }

    const payload = { to: recipient, from, text, category };
    if (metadata) payload.metadata = metadata;

    const { data } = await birdClient.post('/v1/sms/messages', payload);

    console.log(`📩 [BIRD-SMS] texte → ${recipient} (${data.id}) : ${data.status}`);

    await recordSmsSent({ messageId: data.id, message: data });

    return { success: true, message: 'SMS accepté par Bird', data: formatMessage(data) };
  } catch (error) {
    const formatted = formatBirdError(error, "Échec de l'envoi du SMS");
    console.error(`❌ [BIRD-SMS] ${formatted.message}`);
    return { success: false, message: formatted.message, details: formatted.details };
  }
};

/**
 * Relit un SMS : statut de livraison et coût définitif.
 *
 * Le coût n'est disponible qu'après tarification par Bird — quelques secondes
 * après l'acceptation.
 *
 * @param {object} params
 * @param {string} params.messageId Identifiant `sms_...`
 */
exports.getSmsStatus = async ({ messageId }) => {
  try {
    assertBirdConfig();

    if (!messageId) {
      return { success: false, message: "L'identifiant du message est requis" };
    }

    const { data } = await birdClient.get(`/v1/sms/messages/${messageId}`);

    return {
      success: true,
      message: 'Statut du SMS récupéré',
      data: {
        ...formatMessage(data),
        deliveredAt: data.delivered_at || null,
        sentAt: data.sent_at || null,
        carrier: data.carrier || null,
        lastError: data.last_error || null,
        raw: data,
      },
    };
  } catch (error) {
    const formatted = formatBirdError(error, 'Échec de la lecture du SMS');
    console.error(`❌ [BIRD-SMS] ${formatted.message}`);
    return { success: false, message: formatted.message, details: formatted.details };
  }
};

/**
 * Liste les templates SMS disponibles, avec leurs variables et leur aperçu.
 *
 * @param {object} [params]
 * @param {string} [params.category] Filtre par catégorie
 */
exports.listSmsTemplates = async ({ category } = {}) => {
  try {
    assertBirdConfig();

    const { data } = await birdClient.get('/v1/sms/templates', {
      params: category ? { category } : undefined,
    });

    const templates = (data.data || data || []).map(t => ({
      name: t.name,
      category: t.category,
      languages: t.available_languages || [],
      variables: (t.variables || []).map(v => ({
        key: v.key,
        type: v.type,
        required: v.required,
        constraint: v.constraint,
      })),
      body: t.body || t.preview || null,
    }));

    return { success: true, message: 'Templates SMS récupérés', data: { count: templates.length, templates } };
  } catch (error) {
    const formatted = formatBirdError(error, 'Échec de la récupération des templates');
    console.error(`❌ [BIRD-SMS] ${formatted.message}`);
    return { success: false, message: formatted.message, details: formatted.details };
  }
};
