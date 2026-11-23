const { birdClient, formatBirdError } = require('./birdClient');
const { assertBirdConfig, BIRD_DEFAULT_TEMPLATE_SLUG } = require('../../../config/bird');
const { normalizePhoneNumber, validateWhatsappPayload } = require('../../../utils/validator/validatePhoneNumber');

/**
 * Construit le tableau "components" attendu par la plateforme Bird.
 *
 * Format cible :
 *   [{ type: 'body', parameters: [{ type: 'text', name: 'ref', text: 'A1B2' }] }]
 *
 * On accepte en entrée un objet simple { ref: 'A1B2', date: '10 Jul 2026' },
 * ou directement un tableau de components déjà formaté.
 */
const buildTemplateComponents = ({ variables, components }) => {
  if (Array.isArray(components)) return components;
  if (!variables) return [];

  const parameters = Object.entries(variables).map(([name, value]) => ({
    type: 'text',
    name,
    text: String(value),
  }));

  return parameters.length > 0 ? [{ type: 'body', parameters }] : [];
};

/**
 * Envoie un message WhatsApp via la plateforme Bird.
 *
 * ⚠️ WhatsApp est en préversion chez Bird : l'envoi avec un expéditeur
 * personnalisé, un template personnalisé ou un message en texte libre n'est pas
 * encore ouvert à tous. En pratique, seuls les templates fournis par Bird
 * (identifiés par leur "slug") sont utilisables pour le moment.
 *
 * @param {object} params
 * @param {string} params.to          Numéro du destinataire (E.164 ou local)
 * @param {string} [params.text]      Texte libre (peut être refusé en préversion)
 * @param {object} [params.template]  { slug, variables } ou { slug, components }
 * @returns {Promise<{success: boolean, message: string, data?: object}>}
 */
exports.sendWhatsappMessage = async ({ to, text, template }) => {
  try {
    assertBirdConfig();

    const errors = validateWhatsappPayload({ to, text, template });
    if (errors.length > 0) {
      return { success: false, message: errors.join(' | ') };
    }

    const recipient = normalizePhoneNumber(to);
    const payload = { to: recipient };

    if (template) {
      payload.template = {
        slug: template.slug || BIRD_DEFAULT_TEMPLATE_SLUG,
        components: buildTemplateComponents(template),
      };
    } else {
      // Texte libre : accepté uniquement dans la fenêtre de service client de
      // 24h, et soumis aux restrictions de la préversion WhatsApp de Bird.
      payload.text = { body: text };
    }

    const { data } = await birdClient.post('/v1/whatsapp/messages', payload);

    console.log(`✅ [BIRD-WA] Message envoyé à ${recipient} (id: ${data?.id || 'n/a'})`);

    return {
      success: true,
      message: 'Message WhatsApp envoyé',
      data: { messageId: data?.id, status: data?.status, to: recipient },
    };
  } catch (error) {
    const formatted = formatBirdError(error, "Échec de l'envoi du message WhatsApp");
    console.error(`❌ [BIRD-WA] ${formatted.message}`);
    return { success: false, message: formatted.message, details: formatted.details };
  }
};

/**
 * Envoie le même message WhatsApp à plusieurs destinataires.
 * Chaque envoi est indépendant : un échec n'interrompt pas les autres.
 *
 * @param {object} params
 * @param {string[]} params.recipients
 */
exports.sendWhatsappMessageBulk = async ({ recipients, text, template }) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { success: false, message: 'Aucun destinataire fourni' };
  }

  const results = await Promise.all(
    recipients.map(async to => {
      const result = await exports.sendWhatsappMessage({ to, text, template });
      return { to, ...result };
    })
  );

  const sent = results.filter(r => r.success).length;

  return {
    success: sent > 0,
    message: `${sent}/${recipients.length} message(s) WhatsApp envoyé(s)`,
    data: results,
  };
};
