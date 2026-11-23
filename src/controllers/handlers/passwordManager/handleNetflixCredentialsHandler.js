const passwordManagerService = require('../../../services/passwordManagerService');

/**
 * Handler pour gérer (get ou create) les identifiants Netflix
 * Route: POST /api/netflix/credentials
 * Endpoint legacy pour compatibilité avec le frontend
 */
const handleNetflixCredentialsHandler = async (req, res) => {
  try {
    const { userId, nom, prenom } = req.body;

    if (!userId || !nom || !prenom) {
      return res.status(400).json({ 
        success: false, 
        message: "UserId, nom et prénom sont requis" 
      });
    }

    // console.log(`🔐 Gestion identifiants Netflix pour userId: ${userId} (${prenom} ${nom})`);

    try {
      // Délégué entièrement au service createCredentials
      const result = await passwordManagerService.createCredentials(userId, nom, prenom);
      
      return res.json({
        success: true,
        data: {
          email: result.email,
          password: result.password, 
          isNew: result.isNew
        }
      });

    } catch (error) {
      if (error.message === 'EMAIL_TAKEN_BY_OTHER_USER') {
         return res.status(409).json({
           success: false,
           message: "Cet email Netflix est déjà associé à un autre utilisateur. Veuillez contacter le support."
         });
      }
      throw error; // Laisser le catch global gérer les autres erreurs
    }

  } catch (error) {
    console.error('❌ Erreur handleNetflixCredentials:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Erreur lors de la gestion des identifiants Netflix",
      error: error.message 
    });
  }
};

module.exports = handleNetflixCredentialsHandler;
