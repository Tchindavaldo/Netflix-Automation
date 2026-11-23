const axios = require('axios');
const { BIRD_API_URL, BIRD_API_KEY } = require('../../../config/bird');

/**
 * Client HTTP partagé pour la plateforme Bird ({region}.platform.bird.com).
 * L'authentification se fait par bearer token (clé bk_{region}_...).
 */
const birdClient = axios.create({
  baseURL: BIRD_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// La clé est lue à chaque requête (et non figée à l'import) pour rester
// correcte même si dotenv est chargé après ce module.
birdClient.interceptors.request.use(config => {
  const apiKey = process.env.BIRD_API_KEY || BIRD_API_KEY;
  config.headers.Authorization = `Bearer ${apiKey}`;
  return config;
});

/**
 * Normalise une erreur axios venant de Bird en message exploitable.
 * @param {unknown} error
 * @param {string} context
 */
const formatBirdError = (error, context) => {
  const status = error.response?.status;
  const payload = error.response?.data;
  const detail =
    payload?.message ||
    payload?.error?.message ||
    payload?.detail ||
    (Array.isArray(payload?.errors) ? payload.errors.map(e => e.message || e.code).join(', ') : null) ||
    error.message;

  return {
    message: `${context} : ${detail}`,
    status: status || 500,
    details: payload || null,
  };
};

module.exports = { birdClient, formatBirdError };
