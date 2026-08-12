const { db } = require('../../../config/firebase');

const COST_COLLECTION = 'birdCosts';

/**
 * Journalisation des coûts Bird.
 *
 * Bird ne propose aucune vue agrégée des dépenses par l'API : le coût n'est
 * lisible qu'en interrogeant chaque vérification une par une. Sans trace locale,
 * il devient impossible de savoir ce qui a été dépensé.
 *
 * Une ligne est écrite dès l'envoi (coût encore inconnu), puis complétée à la
 * vérification. Les demandes jamais validées restent donc visibles en `pending`
 * plutôt que d'être absentes de la base.
 */

/**
 * Crée la trace d'un envoi. Le coût n'est pas encore connu : Bird ne le résout
 * qu'une fois les tentatives de livraison terminées.
 *
 * @param {object} params
 * @param {string} params.verificationId
 * @param {string} [params.phoneNumber]
 * @param {string} [params.email]
 * @param {string} [params.userId]
 */
exports.recordVerificationSent = async ({ verificationId, phoneNumber, email, userId }) => {
  try {
    const ref = db.collection(COST_COLLECTION).doc(verificationId);

    // Bird réutilise le même `verificationId` lors d'un renvoi tant que la
    // demande est valide, mais facture chaque envoi. On incrémente donc un
    // compteur au lieu d'écraser la trace, sans quoi le total sous-estimerait
    // la dépense réelle.
    const existing = await ref.get();
    if (existing.exists) {
      await ref.update({
        sendCount: (existing.data().sendCount || 1) + 1,
        lastSentAt: new Date().toISOString(),
      });
      return;
    }

    await ref.set({
      verificationId,
      phoneNumber: phoneNumber || null,
      email: email || null,
      userId: userId || null,
      status: 'pending',
      // Renseignés à la vérification, quand Bird a résolu les tentatives.
      totalCost: null,
      currencyCode: null,
      attempts: [],
      verified: false,
      sendCount: 1,
      sentAt: new Date().toISOString(),
      lastSentAt: new Date().toISOString(),
      resolvedAt: null,
    });
  } catch (error) {
    // Le suivi des coûts ne doit jamais faire échouer un envoi d'OTP.
    console.warn(`⚠️ [BIRD-COST] Trace d'envoi impossible : ${error.message}`);
  }
};

/**
 * Complète la trace avec les coûts réels, une fois les tentatives résolues.
 *
 * Format Bird : `cost.amount` est une chaîne, accompagnée de `cost.currency_code`.
 * Le SMS expose en plus `segments` (caractères, nombre, encodage) ; WhatsApp non.
 *
 * @param {object} params
 * @param {string} params.verificationId
 * @param {object} params.verification Réponse brute de GET /v1/verify/verifications/{id}
 * @param {boolean} params.verified    Le code a-t-il été validé
 * @param {string} [params.userId]
 * @returns {Promise<{totalCost: number|null, currencyCode: string|null}>}
 */
exports.recordVerificationCost = async ({ verificationId, verification, verified, userId }) => {
  try {
    const attempts = (verification?.attempts || []).map(attempt => ({
      channel: attempt.channel,
      deliveryStatus: attempt.delivery_status || null,
      error: attempt.error || null,
      reason: attempt.reason || null,
      sender: attempt.sender || null,
      segments: attempt.segments || null,
      amount: attempt.cost?.amount != null ? Number(attempt.cost.amount) : null,
      currencyCode: attempt.cost?.currency_code || null,
    }));

    const rawTotal = verification?.cost?.amount;
    const totalCost = rawTotal != null ? Number(rawTotal) : null;
    const currencyCode =
      verification?.cost?.currency_code || attempts.find(a => a.currencyCode)?.currencyCode || null;

    const payload = {
      status: verification?.status || null,
      destinationCountry: verification?.destination_country || null,
      totalCost: Number.isFinite(totalCost) ? totalCost : null,
      currencyCode,
      attempts,
      // Canal réellement facturé : celui qui a livré, sinon le dernier tenté.
      deliveredChannel: attempts.find(a => a.deliveryStatus === 'delivered')?.channel || null,
      verified: Boolean(verified),
      resolvedAt: new Date().toISOString(),
    };

    if (userId) payload.userId = userId;

    // `set(merge)` et non `update` : la trace d'envoi peut manquer si l'écriture
    // initiale a échoué, et on ne veut pas perdre le coût pour autant.
    await db.collection(COST_COLLECTION).doc(verificationId).set(payload, { merge: true });

    console.log(
      `💰 [BIRD-COST] ${verificationId} : ${payload.totalCost ?? 'n/a'} ${currencyCode || ''} ` +
        `via ${payload.deliveredChannel || 'aucun canal'}`.trim()
    );

    return { totalCost: payload.totalCost, currencyCode };
  } catch (error) {
    console.warn(`⚠️ [BIRD-COST] Enregistrement du coût impossible : ${error.message}`);
    return { totalCost: null, currencyCode: null };
  }
};

/**
 * Enregistre le coût d'un SMS envoyé hors parcours OTP.
 *
 * Les SMS transactionnels (confirmation de paiement, rappel de renouvellement…)
 * sont facturés au même titre que les OTP et doivent figurer dans le même
 * récapitulatif, sans quoi la dépense affichée est incomplète.
 *
 * Le coût vaut `null` à l'acceptation : il est complété plus tard par
 * `resolvePendingCosts`, comme pour les vérifications.
 *
 * @param {object} params
 * @param {string} params.messageId Identifiant `sms_...`
 * @param {object} params.message   Réponse Bird de l'envoi
 * @param {string} [params.userId]
 */
exports.recordSmsSent = async ({ messageId, message, userId }) => {
  try {
    await db
      .collection(COST_COLLECTION)
      .doc(messageId)
      .set({
        type: 'sms',
        messageId,
        phoneNumber: message?.to || null,
        template: message?.template || null,
        category: message?.category || null,
        status: message?.status || 'accepted',
        totalCost: message?.cost?.amount != null ? Number(message.cost.amount) : null,
        currencyCode: message?.cost?.currency_code || null,
        segments: message?.segments || null,
        attempts: [],
        verified: false,
        userId: userId || null,
        sentAt: new Date().toISOString(),
        resolvedAt: null,
      });
  } catch (error) {
    console.warn(`⚠️ [BIRD-COST] Trace SMS impossible : ${error.message}`);
  }
};

/**
 * Complète les traces restées sans coût.
 *
 * Le coût vaut `null` à l'envoi (Bird ne l'a pas encore établi) et n'est écrit
 * qu'à la vérification. Une demande jamais validée — utilisateur qui abandonne —
 * conserverait donc `totalCost: null` indéfiniment, alors qu'elle a bien été
 * facturée.
 *
 * On les résout ici, au moment de consulter le récapitulatif : ce sont des
 * lectures (gratuites, aucun envoi), ce qui évite d'avoir à planifier un job.
 *
 * @param {Array<FirebaseFirestore.QueryDocumentSnapshot>} docs
 * @returns {Promise<Map<string, object>>} données à jour, par id de document
 */
const resolvePendingCosts = async docs => {
  // Import différé : getMessageCost.service dépend de ce module.
  const { getVerificationDetails } = require('./getMessageCost.service');

  const resolved = new Map();

  const pending = docs.filter(d => {
    const c = d.data();
    return c.totalCost === null || c.totalCost === undefined;
  });

  if (!pending.length) return resolved;

  console.log(`🔄 [BIRD-COST] Résolution de ${pending.length} demande(s) sans coût`);

  const { getSmsStatus } = require('../sms/sendSms.service');

  await Promise.all(
    pending.map(async doc => {
      try {
        // Un SMS se relit sur un autre endpoint que les vérifications OTP.
        if (doc.data().type === 'sms') {
          const sms = await getSmsStatus({ messageId: doc.id });
          if (!sms.success) return;

          const payload = {
            status: sms.data.status,
            totalCost: sms.data.cost?.amount ?? null,
            currencyCode: sms.data.cost?.currencyCode ?? null,
            segments: sms.data.segments || null,
            lastError: sms.data.lastError || null,
            resolvedAt: new Date().toISOString(),
          };

          await db.collection(COST_COLLECTION).doc(doc.id).set(payload, { merge: true });
          resolved.set(doc.id, {
            ...doc.data(),
            ...payload,
            attempts: [{ channel: 'sms', amount: payload.totalCost }],
          });
          return;
        }

        const details = await getVerificationDetails({ verificationId: doc.id });
        if (!details.success) return;

        const raw = details.data.raw;
        // `verified` reste la valeur d'origine : une demande expirée sans
        // validation ne doit pas être comptée comme réussie.
        const updated = await exports.recordVerificationCost({
          verificationId: doc.id,
          verification: raw,
          verified: doc.data().verified === true,
        });

        resolved.set(doc.id, {
          ...doc.data(),
          status: raw?.status || doc.data().status,
          totalCost: updated.totalCost,
          currencyCode: updated.currencyCode,
          attempts: (raw?.attempts || []).map(a => ({
            channel: a.channel,
            amount: a.cost?.amount != null ? Number(a.cost.amount) : null,
          })),
        });
      } catch (error) {
        console.warn(`⚠️ [BIRD-COST] Résolution de ${doc.id} impossible : ${error.message}`);
      }
    })
  );

  return resolved;
};

/**
 * Total dépensé sur une période, tous canaux confondus.
 *
 * Les demandes dont le coût n'était pas encore connu sont résolues auprès de
 * Bird au passage, afin que le total reflète la dépense réelle et non les
 * seules vérifications abouties.
 *
 * @param {object} [params]
 * @param {string} [params.from] Date ISO de début (incluse)
 * @param {string} [params.to]   Date ISO de fin (exclue)
 */
exports.getCostSummary = async ({ from, to } = {}) => {
  let query = db.collection(COST_COLLECTION);
  if (from) query = query.where('sentAt', '>=', from);
  if (to) query = query.where('sentAt', '<', to);

  const snapshot = await query.get();
  const resolved = await resolvePendingCosts(snapshot.docs);

  const summary = {
    count: snapshot.size,
    verified: 0,
    abandoned: 0,
    pending: 0,
    totalCost: 0,
    currencyCode: null,
    byChannel: {},
  };

  snapshot.forEach(doc => {
    // Données fraîchement résolues si disponibles, sinon celles en base.
    const d = resolved.get(doc.id) || doc.data();

    if (d.verified) summary.verified += 1;
    // Facturée mais jamais validée : le code n'a pas été saisi à temps.
    else if (d.status === 'expired' || d.status === 'failed') summary.abandoned += 1;
    // Encore valide : l'utilisateur peut toujours saisir son code.
    else summary.pending += 1;

    if (typeof d.totalCost === 'number') summary.totalCost += d.totalCost;
    if (!summary.currencyCode && d.currencyCode) summary.currencyCode = d.currencyCode;

    // Un SMS direct n'a pas de tentatives : son coût est porté par le document
    // lui-même. Les vérifications OTP, elles, ventilent par tentative.
    if (d.type === 'sms') {
      const entry = (summary.byChannel.sms ||= { count: 0, cost: 0 });
      entry.count += 1;
      if (typeof d.totalCost === 'number') entry.cost += d.totalCost;
      return;
    }

    (d.attempts || []).forEach(a => {
      if (!a.channel) return;
      const entry = (summary.byChannel[a.channel] ||= { count: 0, cost: 0 });
      entry.count += 1;
      if (typeof a.amount === 'number') entry.cost += a.amount;
    });
  });

  // Les montants Bird ont 4 décimales : on évite les artefacts de virgule flottante.
  summary.totalCost = Number(summary.totalCost.toFixed(4));
  Object.values(summary.byChannel).forEach(e => {
    e.cost = Number(e.cost.toFixed(4));
  });

  return summary;
};
