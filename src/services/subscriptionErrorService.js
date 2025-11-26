const { db } = require('../config/firebase');

/**
 * Service pour la gestion des erreurs d'abonnement dans Firebase
 */
const subscriptionErrorService = {
  /**
   * Enregistrer une erreur d'abonnement
   * @param {Object} errorData - Données de l'erreur
   * @returns {Promise<Object>} - Erreur enregistrée avec son ID
   */
  logError: async (errorData) => {
    try {
      // console.log('🔍 Données reçues dans subscriptionErrorService.logError:', {
      //   hasStepName: !!errorData.stepName,
      //   hasError: !!errorData.error,
      //   hasUserId: !!errorData.userId,
      //   hasPlanActivationId: !!errorData.planActivationId,
      //   hasErrorContext: !!errorData.errorContext,
      //   hasCardInfo: !!errorData.cardInfo,
      //   hasSnapshotUrls: !!errorData.snapshotUrls
      // });

      // Extraire les données importantes du contexte d'erreur
      const { 
        stepName, error, sessionId, userId, planActivationId, 
        email, motDePasse, typeDePlan, amount, 
        buttonSelector, planSelector, cardInfo, snapshotUrls,
        currentUrl, attempts, isSessionRetry, previousSessionId,
        sessionRetryAttempt, retryReason, errorContext
      } = errorData;

      // Créer un enregistrement structuré avec toutes les données importantes
      const errorRecord = {
        // Identifiants
        sessionId: sessionId || errorContext?.sessionId || 'inconnu',
        userId: userId || errorContext?.userId || 'inconnu',
        planActivationId: planActivationId || errorContext?.planActivationId || 'inconnu',
        
        // Informations sur l'erreur
        stepName: stepName || errorContext?.stepName || 'inconnue',
        error: (error?.message || error || errorContext?.error?.message || errorContext?.error || 'Erreur inconnue').toString().substring(0, 1000),
        errorDetails: (error?.stack || errorContext?.error?.stack || '').substring(0, 5000),
        timestamp: new Date().toISOString(),
        dateCreation: new Date().toISOString(),
        
        // Données de l'utilisateur
        email: email || errorContext?.email || 'inconnu',
        typeDePlan: typeDePlan || errorContext?.typeDePlan || 'inconnu',
        amount: amount || errorContext?.amount || 0,
        
        // Contexte de l'erreur
        currentUrl: currentUrl || errorContext?.currentUrl || 'inconnue',
        buttonSelector: buttonSelector || errorContext?.buttonSelector || 'inconnu',
        planSelector: planSelector || errorContext?.planSelector || 'inconnu',
        attempts: attempts || errorContext?.attempts || 1,
        
        // Informations de session et retry
        isSessionRetry: isSessionRetry || errorContext?.isSessionRetry || false,
        previousSessionId: previousSessionId || errorContext?.previousSessionId || null,
        sessionRetryAttempt: sessionRetryAttempt || errorContext?.sessionRetryAttempt || 0,
        retryReason: retryReason || errorContext?.retryReason || null,
        
        // Données de la carte (sécurisées)
        cardInfo: (() => {
          const ci = cardInfo || errorContext?.cardInfo;
          if (!ci) return null;
          return {
            lastFourDigits: ci.cardNumber ? ci.cardNumber.toString().slice(-4) : 
                          ci.lastFourDigits ? ci.lastFourDigits.toString() : null,
            expirationDate: ci.expirationDate || null,
            cardholderName: ci.cardholderName ? '****' + ci.cardholderName.toString().slice(-4) : null
          };
        })(),
        
        // URLs des snapshots
        snapshotUrls: snapshotUrls || errorContext?.snapshotUrls || null,
        snapshotFolder: errorContext?.snapshotFolder || null,
        
        // Données brutes complètes (pour référence)
        rawErrorData: JSON.parse(JSON.stringify(errorData, (key, value) => {
          // Éviter les références circulaires
          if (value === errorData) return '[Circular]';
          if (value instanceof Error) return value.toString();
          return value;
        }))
      };

      // console.log('📝 Enregistrement de l\'erreur avec les données:', {
      //   stepName: errorRecord.stepName,
      //   error: errorRecord.error,
      //   hasCardInfo: !!errorRecord.cardInfo,
      //   hasSnapshotUrls: !!errorRecord.snapshotUrls,
      //   rawDataKeys: Object.keys(errorRecord.rawErrorData || {})
      // });

      const docRef = await db.collection('subscription_errors').add(errorRecord);
      
      // console.log(`✅ Enregistrement Firestore réussi avec l'ID: ${docRef.id}`);
      
      // Vérifier que le document a bien été créé
      const createdDoc = await docRef.get();
      if (!createdDoc.exists) {
        throw new Error('Le document Firestore n\'a pas pu être créé');
      }
      
      const result = {
        id: docRef.id,
        ...createdDoc.data()
      };

      // console.log(`✅ Erreur d'abonnement enregistrée avec succès. ID: ${docRef.id}`);
      return result;

    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement de l\'erreur d\'abonnement:', error);
      throw new Error(`Erreur lors de l'enregistrement: ${error.message}`);
    }
  },

  /**
   * Récupérer les erreurs par planActivationId
   * @param {string} planActivationId - ID de l'activation
   * @returns {Promise<Array>} - Liste des erreurs
   */
  getErrorsByActivationId: async (planActivationId) => {
    try {
      const snapshot = await db.collection('subscription_errors')
        .where('planActivationId', '==', planActivationId)
        .orderBy('timestamp', 'desc')
        .get();

      const errors = [];
      snapshot.forEach(doc => {
        errors.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return errors;

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des erreurs:', error);
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }
  }
};

module.exports = subscriptionErrorService;
