const { DEFAULT_COUNTRY_CODE } = require('../../config/bird');

/**
 * Normalise un numéro de téléphone au format E.164 attendu par Bird (+237698087460).
 * Accepte les formats courants : "+237 6 98 08 74 60", "00237698087460", "698087460".
 *
 * @param {string} phoneNumber
 * @returns {string|null} le numéro normalisé, ou null si invalide
 */
exports.normalizePhoneNumber = phoneNumber => {
  if (!phoneNumber || typeof phoneNumber !== 'string') return null;

  // On ne garde que les chiffres et un éventuel '+' initial
  let cleaned = phoneNumber.trim().replace(/[\s\-().]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = `+${cleaned.slice(2)}`;
  } else if (!cleaned.startsWith('+')) {
    // Numéro local : on préfixe avec l'indicatif par défaut
    cleaned = `+${DEFAULT_COUNTRY_CODE}${cleaned}`;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) return null;

  return cleaned;
};

/**
 * Valide le payload d'envoi d'un message WhatsApp.
 *
 * @returns {string[]} liste des erreurs (vide si valide)
 */
exports.validateWhatsappPayload = ({ to, text, template }) => {
  const errors = [];

  if (!to) {
    errors.push('Le numéro du destinataire (to) est requis');
  } else if (!exports.normalizePhoneNumber(to)) {
    errors.push(`Numéro de téléphone invalide : ${to}`);
  }

  if (!text && !template) {
    errors.push('Un contenu est requis : renseignez "text" ou "template"');
  }

  if (text && template) {
    errors.push('"text" et "template" sont mutuellement exclusifs');
  }

  if (template && !template.slug && !process.env.BIRD_DEFAULT_TEMPLATE_SLUG) {
    errors.push('template.slug est requis (ou BIRD_DEFAULT_TEMPLATE_SLUG dans la config)');
  }

  return errors;
};
