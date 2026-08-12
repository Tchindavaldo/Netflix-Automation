// Configuration du client Bird (https://bird.com) pour WhatsApp et les OTP.
//
// ⚠️ Bird expose deux plateformes distinctes :
//   - l'ancienne : api.bird.com/workspaces/{workspaceId}/... (auth "AccessKey")
//   - la nouvelle : {region}.platform.bird.com/v1/...        (auth "Bearer")
// Ce code cible la NOUVELLE plateforme, celle utilisée par les comptes créés
// via le dashboard bird.com/dashboard. Aucun workspaceId ni channelId n'est
// nécessaire : la clé d'API porte déjà le contexte.
//
// Endpoints utilisés :
//   POST /v1/whatsapp/messages            -> envoi d'un message WhatsApp
//   POST /v1/verify/verifications         -> envoi d'un code OTP
//   POST /v1/verify/verifications/check   -> vérification du code

// Les clés Bird ont la forme bk_{region}_xxxxx. La région détermine l'URL.
const BIRD_API_KEY = process.env.BIRD_API_KEY;

/**
 * Déduit la région à partir de la clé d'API (bk_us1_..., bk_eu1_...).
 * Retourne 'us1' par défaut si le format n'est pas reconnu.
 */
const detectRegion = apiKey => {
  const match = /^bk_([a-z0-9]+)_/.exec(apiKey || '');
  return match ? match[1] : 'us1';
};

const BIRD_REGION = process.env.BIRD_REGION || detectRegion(BIRD_API_KEY);

// Peut être surchargée explicitement si Bird change de domaine.
const BIRD_API_URL = process.env.BIRD_API_URL || `https://${BIRD_REGION}.platform.bird.com`;

// Template WhatsApp par défaut (identifié par son "slug" sur la nouvelle
// plateforme) utilisé quand aucun template n'est passé à l'appel.
const BIRD_DEFAULT_TEMPLATE_SLUG = process.env.BIRD_DEFAULT_TEMPLATE_SLUG;

// Indicatif utilisé quand l'utilisateur saisit un numéro local sans préfixe (Cameroun).
const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || '237';

/**
 * Vérifie que la configuration minimale Bird est présente.
 * On ne fait pas planter le serveur au démarrage : l'erreur est levée à l'envoi,
 * pour que le reste de l'API reste utilisable même sans Bird configuré.
 */
const assertBirdConfig = () => {
  if (!process.env.BIRD_API_KEY && !BIRD_API_KEY) {
    throw new Error('Configuration Bird incomplète : BIRD_API_KEY manquant');
  }
};

module.exports = {
  BIRD_API_KEY,
  BIRD_API_URL,
  BIRD_REGION,
  BIRD_DEFAULT_TEMPLATE_SLUG,
  DEFAULT_COUNTRY_CODE,
  assertBirdConfig,
};
