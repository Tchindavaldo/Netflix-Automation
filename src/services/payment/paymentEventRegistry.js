// Registre partagé pour les transactions en cours de polling.
// Permet au webhook d'annuler le polling actif quand il reçoit l'event final.

const activeRequests = new Map();

const register = (transactionId) => {
  activeRequests.set(transactionId, { cancelled: false, externalResult: null });
};

const isCancelled = (transactionId) => {
  const entry = activeRequests.get(transactionId);
  return entry?.cancelled === true;
};

const cancel = (transactionId, externalResult = null) => {
  const entry = activeRequests.get(transactionId);
  if (entry) {
    entry.cancelled = true;
    entry.externalResult = externalResult;
  }
};

const remove = (transactionId) => {
  activeRequests.delete(transactionId);
};

const getExternalResult = (transactionId) => {
  return activeRequests.get(transactionId)?.externalResult || null;
};

module.exports = { activeRequests, register, isCancelled, cancel, remove, getExternalResult };
