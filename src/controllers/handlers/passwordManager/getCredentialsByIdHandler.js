const passwordManagerService = require('../../../services/passwordManagerService');

/**
 * Handler pour récupérer les identifiants Netflix par ID
 * Route: GET /api/netflix/credentials/:id
 */
const getCredentialsByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    // Utilisation du service générique avec filtre 'id' et limite 1
    const credentials = await passwordManagerService.getCredentials({ id }, 1);
    
    if (!credentials) {
      return res.status(404).json({
        success: false,
        message: `Aucun identifiant trouvé avec l'ID : ${id}`
      });
    }

    return res.json({
      success: true,
      data: credentials
    });
  } catch (error) {
    console.error('❌ Erreur getCredentialsById:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des identifiants",
      error: error.message
    });
  }
};

module.exports = getCredentialsByIdHandler;
