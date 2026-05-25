// POST /api/payment/webhook
// Endpoint appelé par Digikuntz à chaque changement de statut d'une transaction.
// Payload: { id, status, data: { paymentLink, transactionRef, ... } }
// Statuts: payin_pending | payin_success | payin_error | payin_closed

const transactionService = require('../../../services/transactionService');
const planActivationService = require('../../../services/planActivationService');
const paymentRegistry = require('../../../services/payment/paymentEventRegistry');
const sendPushNotification = require('../../../services/notification/FCM/sendPushNotification.service');
const userService = require('../../../services/userService');
const { db } = require('../../../config/firebase');

// Map des statuts Digikuntz → statuts internes
const STATUS_MAP = {
  payin_pending: 'pending',
  payin_success: 'success',
  payin_error: 'failed',
  payin_closed: 'cancelled',
};

const isTerminal = (status) => status === 'success' || status === 'failed' || status === 'cancelled';

const webhookHandler = async (req, res) => {
  // Toujours répondre 200 rapidement à Digikuntz (sinon ils retry).
  // On traite l'event en arrière-plan.
  res.status(200).json({ received: true });

  try {
    const { id: externalTransactionId, status: rawStatus, data } = req.body || {};

    if (!externalTransactionId || !rawStatus) {
      console.warn('⚠️ [WEBHOOK] Payload invalide:', JSON.stringify(req.body));
      return;
    }

    const internalStatus = STATUS_MAP[rawStatus] || rawStatus;
    console.log(`🪝 [WEBHOOK] Reçu Tx=${externalTransactionId} status=${rawStatus} → ${internalStatus}`);

    // 1. Trouver la transaction interne
    const transaction = await transactionService.getTransactionByExternalId(externalTransactionId);
    if (!transaction) {
      console.warn(`⚠️ [WEBHOOK] Transaction introuvable: ${externalTransactionId}`);
      return;
    }

    // 2. Idempotence: ne rien refaire si on a déjà traité ce statut terminal
    if (transaction.status === internalStatus && isTerminal(internalStatus)) {
      console.log(`ℹ️ [WEBHOOK] Statut déjà à jour (${internalStatus}), skip.`);
      return;
    }

    // 3. Cancel le polling en cours pour cette transaction (le webhook a la priorité)
    if (isTerminal(internalStatus)) {
      paymentRegistry.cancel(externalTransactionId, { status: rawStatus, data });
    }

    // 4. Mettre à jour la transaction
    await transactionService.updateTransactionStatusByExternalId(externalTransactionId, internalStatus);

    // 5. Mettre à jour le plan associé selon le statut
    const { userId, planActivationId } = transaction;
    if (planActivationId) {
      try {
        if (internalStatus === 'success') {
          await planActivationService.updateActivation(planActivationId, {
            statut: 'paid',
            reqteStatusSuccess: 'success',
            dateModification: new Date().toISOString(),
          });
        } else if (internalStatus === 'failed' || internalStatus === 'cancelled') {
          await planActivationService.updateActivation(planActivationId, {
            statut: 'failed',
            reqteStatusSuccess: internalStatus,
            dateModification: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error('❌ [WEBHOOK] MAJ plan activation échouée:', e.message);
      }
    }

    // 6. Émettre vers la room socket de l'utilisateur
    try {
      const io = require('../../../../socket').getIO();
      if (internalStatus === 'success') {
        console.log(`📡 [WEBHOOK-SOCKET] payment_validated → ${userId}`);
        io.to(userId).emit('payment_validated', {
          success: true,
          message: 'Paiement validé avec succès !',
          data: { userId, transactionId: externalTransactionId, planActivationId },
        });
      } else if (internalStatus === 'failed' || internalStatus === 'cancelled') {
        console.log(`📡 [WEBHOOK-SOCKET] payment_failed → ${userId}`);
        io.to(userId).emit('payment_failed', {
          success: false,
          message: internalStatus === 'cancelled' ? 'Paiement annulé.' : 'Le paiement a échoué.',
          data: { userId, transactionId: externalTransactionId },
        });
      }
    } catch (e) {
      console.error('❌ [WEBHOOK-SOCKET] Émission échouée:', e.message);
    }

    // 7. Push notification à l'utilisateur (uniquement statuts terminaux)
    if (isTerminal(internalStatus) && userId) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const { fcm, apns } = userService.collectUserTokens(userDoc.data());
          const title = internalStatus === 'success' ? 'Paiement confirmé' : 'Paiement non abouti';
          const body =
            internalStatus === 'success'
              ? `Votre paiement de ${data?.estimation || transaction.amount} XAF a été reçu. Activation en cours.`
              : internalStatus === 'cancelled'
                ? 'Le paiement a été annulé.'
                : 'Le paiement a échoué. Vous pouvez réessayer.';

          await sendPushNotification({
            tokens: fcm,
            apnsTokens: apns,
            title,
            body,
            data: { type: 'payment', status: internalStatus, transactionId: externalTransactionId },
          });
        }
      } catch (e) {
        console.error('❌ [WEBHOOK-PUSH] Échec envoi push:', e.message);
      }
    }
  } catch (error) {
    // Ne jamais throw — la réponse 200 a déjà été envoyée à Digikuntz.
    console.error('❌ [WEBHOOK] Erreur critique non bloquante:', error.message);
  }
};

module.exports = webhookHandler;
