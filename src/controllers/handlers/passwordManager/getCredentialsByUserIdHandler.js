const passwordManagerService = require('../../../services/passwordManagerService');

/**
 * Handler pour récupérer les identifiants Netflix par userId
 * Route: GET /api/netflix/credentials/user/:userId
 */
const getCredentialsByUserIdHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    // Utilisation du service générique avec filtre user_id et limite 1
    const credentials = await passwordManagerService.getCredentials({ user_id: userId }, 1);
    
    if (!credentials) {
      return res.status(404).json({
        success: false,
        message: `Aucun identifiant trouvé pour l'utilisateur : ${userId}`
      });
    }

    return res.json({
      success: true,
      data: credentials
    });
  } catch (error) {
    console.error('❌ Erreur getCredentialsByUserId:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des identifiants",
      error: error.message
    });
  }
};

module.exports = getCredentialsByUserIdHandler;
