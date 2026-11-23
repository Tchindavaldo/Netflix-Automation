const planActivationService = require('../services/planActivationService');
const socketModule = require('../../socket');

/**
 * Contrôleur pour la gestion des activations de plans Netflix
 */
const planActivationController = {
  /**
   * Créer une nouvelle activation de plan
   */
  createActivation: async (req, res) => {
    try {
      const {
        userId,
        planNetflix,
        amount,
        statut,
        reqteStatusSuccess,
        numeroOM,
        email,
        typePaiement,
        dureeActivation,
        dateExpiration
      } = req.body;

      // Validation des champs obligatoires avec détection précise des manquants
      const requiredFields = ['userId', 'planNetflix', 'amount', 'reqteStatusSuccess'];
      const missingFields = [];
      
      requiredFields.forEach(field => {
        if (field === 'reqteStatusSuccess') {
          if (req.body[field] === undefined) {
            missingFields.push(field);
          }
        } else if (!req.body[field]) {
          missingFields.push(field);
        }
      });

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Champs manquants: ${missingFields.join(', ')}`,
          missingFields: missingFields,
          requiredFields: requiredFields
        });
      }

      // Validation de reqteStatusSuccess (doit être 'pending', 'failed', ou 'success')
      const validReqteStatuses = ['pending', 'failed', 'success'];
      const reqteStatus = reqteStatusSuccess || 'pending';
      
      if (!validReqteStatuses.includes(reqteStatus)) {
        return res.status(400).json({
          success: false,
          message: `reqteStatusSuccess invalide. Valeurs acceptées: ${validReqteStatuses.join(', ')}`,
          receivedValue: reqteStatus,
          validValues: validReqteStatuses
        });
      }

      const activationData = {
        userId,
        planNetflix,
        amount: parseFloat(amount),
        statut: statut || 'pending',
        reqteStatusSuccess: reqteStatus, // String: 'pending', 'failed', ou 'success'
        numeroOM: numeroOM || null,
        email: email || null,
        typePaiement: typePaiement || 'orange_money',
        dureeActivation: dureeActivation || 30, // 30 jours par défaut
        dateDebut: null,
        dateExpiration: null,
        dateCreation: new Date().toISOString(),
        dateModification: new Date().toISOString()
      };

      const result = await planActivationService.createActivation(activationData);

      // Émettre l'événement Socket.IO pour la création
      try {
        const io = socketModule.getIO();
        io.to(userId).emit('activationcreated', {
          success: true,
          message: 'Activation créée avec succès',
          data: result,
          timestamp: new Date().toISOString(),
        });

        // console.log(`🔔 Socket.IO: Activation créée envoyée à ${userId}`);
      } catch (socketError) {
        // console.error('❌ Erreur lors de l\'émission Socket.IO:', socketError);
      }

      res.status(201).json({
        success: true,
        message: 'Activation créée avec succès',
        data: result
      });

    } catch (error) {
      // console.error('Erreur lors de la création de l\'activation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la création de l\'activation'
      });
    }
  },

  /**
   * Récupérer une activation par ID
   */
  getActivationById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Paramètre manquant: id',
          missingParameters: ['id'],
          requiredParameters: ['id']
        });
      }

      const result = await planActivationService.getActivationById(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Activation non trouvée'
        });
      }

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      // console.error('Erreur lors de la récupération de l\'activation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la récupération de l\'activation'
      });
    }
  },

  /**
   * Récupérer toutes les activations d'un utilisateur
   */
  getActivationsByUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 10, offset = 0, all } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Paramètre manquant: userId',
          missingParameters: ['userId'],
          requiredParameters: ['userId']
        });
      }

      const result = await planActivationService.getActivationsByUser(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        includeAll: all === 'true'
      });

      res.status(200).json({
        success: true,
        data: result.activations,
        pagination: {
          total: result.total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (error) {
      // console.error('Erreur lors de la récupération des activations utilisateur:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la récupération des activations'
      });
    }
  },

  /**
   * Modifier une activation
   */
  updateActivation: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Paramètre manquant: id',
          missingParameters: ['id'],
          requiredParameters: ['id']
        });
      }

      // Ajouter la date de modification
      updateData.dateModification = new Date().toISOString();

      // Convertir le montant en nombre si présent
      if (updateData.amount) {
        updateData.amount = parseFloat(updateData.amount);
      }

      const result = await planActivationService.updateActivation(id, updateData);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Activation non trouvée'
        });
      }

      // Émettre l'événement Socket.IO pour la mise à jour
      try {
        const io = socketModule.getIO();
        io.to(result.userId).emit('activationupdate', {
          success: true,
          message: 'Activation mise à jour avec succès',
          data: result,
          timestamp: new Date().toISOString(),
        });

        // console.log(`🔔 Socket.IO: Mise à jour d'activation envoyée à ${result.userId}`);
      } catch (socketError) {
        // console.error('❌ Erreur lors de l\'émission Socket.IO:', socketError);
      }

      res.status(200).json({
        success: true,
        message: 'Activation mise à jour avec succès',
        data: result
      });

    } catch (error) {
      // console.error('Erreur lors de la mise à jour de l\'activation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la mise à jour de l\'activation'
      });
    }
  },

  /**
   * Supprimer une activation
   */
  deleteActivation: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Paramètre manquant: id',
          missingParameters: ['id'],
          requiredParameters: ['id']
        });
      }

      const result = await planActivationService.deleteActivation(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Activation non trouvée'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Activation supprimée avec succès'
      });

    } catch (error) {
      // console.error('Erreur lors de la suppression de l\'activation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la suppression de l\'activation'
      });
    }
  },

  /**
   * Récupérer toutes les activations avec pagination
   */
  getAllActivations: async (req, res) => {
    try {
      const { limit = 10, offset = 0, statut, all } = req.query;

      const filters = {};
      if (statut) {
        filters.statut = statut;
      }

      const result = await planActivationService.getAllActivations({
        limit: parseInt(limit),
        offset: parseInt(offset),
        filters,
        includeAll: all === 'true'
      });

      res.status(200).json({
        success: true,
        data: result.activations,
        pagination: {
          total: result.total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (error) {
      // console.error('Erreur lors de la récupération de toutes les activations:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la récupération des activations'
      });
    }
  },

  /**
   * Changer le statut d'une activation avec logique automatique
   */
  changeActivationStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { statut } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Paramètre manquant: id',
          missingParameters: ['id'],
          requiredParameters: ['id']
        });
      }

      // Récupérer l'activation actuelle
      const currentActivation = await planActivationService.getActivationById(id);
      
      if (!currentActivation) {
        return res.status(404).json({
          success: false,
          message: 'Activation non trouvée'
        });
      }

      let nouveauStatut = statut;
      let updateData = {
        dateModification: new Date().toISOString()
      };

      // Logique automatique si aucun statut n'est fourni
      if (!statut) {
        if (currentActivation.statut === 'pending') {
          nouveauStatut = 'activated';
        } else if (currentActivation.statut === 'activated') {
          nouveauStatut = 'expired';
        } else {
          return res.status(400).json({
            success: false,
            message: 'Impossible de déterminer le nouveau statut automatiquement'
          });
        }
      }

      updateData.statut = nouveauStatut;

      // Si le statut passe à 'activated', définir les dates de début et d'expiration
      if (nouveauStatut === 'activated') {
        const now = new Date();
        const dateExpiration = new Date(now);
        dateExpiration.setDate(dateExpiration.getDate() + 29); // Ajouter 29 jours

        updateData.dateDebut = now.toISOString();
        updateData.dateExpiration = dateExpiration.toISOString();
        
        // console.log(`📅 Dates définies: Début = ${updateData.dateDebut}, Expiration = ${updateData.dateExpiration}`);
      }

      // Mettre à jour l'activation
      const result = await planActivationService.updateActivation(id, updateData);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Activation non trouvée'
        });
      }

      // Émettre l'événement Socket.IO
      try {
        const io = socketModule.getIO();
        io.to(currentActivation.userId).emit('activationstatuschanged', {
          success: true,
          message: `Statut changé de ${currentActivation.statut} à ${nouveauStatut}`,
          data: result,
          previousStatus: currentActivation.statut,
          newStatus: nouveauStatut,
          timestamp: new Date().toISOString(),
        });

        // console.log(`🔔 Socket.IO: Changement de statut envoyé à ${currentActivation.userId}`);
      } catch (socketError) {
        // console.error('❌ Erreur lors de l\'émission Socket.IO:', socketError);
      }

      res.status(200).json({
        success: true,
        message: `Statut mis à jour avec succès de ${currentActivation.statut} à ${nouveauStatut}`,
        data: result,
        previousStatus: currentActivation.statut,
        newStatus: nouveauStatut
      });

    } catch (error) {
      // console.error('Erreur lors du changement de statut:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors du changement de statut'
      });
    }
  },
  
  /**
   * Mettre à jour manuellement la période d'une activation
   */
  updateActivationPeriod: async (req, res) => {
    try {
      const { id } = req.params;
      const { dureePlan, joursMarge, dateFin, dateDebut } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID requis' });
      }

      const current = await planActivationService.getActivationById(id);
      if (!current) {
        return res.status(404).json({ success: false, message: 'Activation non trouvée' });
      }

      const updateData = {
        dateModification: new Date().toISOString()
      };

      // Si on donne une date de fin précise
      if (dateFin) updateData.dateExpiration = dateFin;
      
      // Si on change la durée ou la marge, on recalcule la date de fin
      if (dureePlan !== undefined || joursMarge !== undefined || dateDebut) {
        const dDebut = new Date(dateDebut || current.dateDebut || new Date());
        const dDuree = dureePlan !== undefined ? parseInt(dureePlan) : (current.dureePlan || 30);
        const dMarge = joursMarge !== undefined ? parseInt(joursMarge) : (current.joursMarge || 2);
        
        const dFin = new Date(dDebut);
        dFin.setDate(dFin.getDate() + dDuree - dMarge);
        
        updateData.dateDebut = dDebut.toISOString();
        updateData.dureePlan = dDuree;
        updateData.joursMarge = dMarge;
        updateData.dateExpiration = dFin.toISOString();
      }

      const result = await planActivationService.updateActivation(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Période mise à jour avec succès',
        data: result
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = planActivationController;
