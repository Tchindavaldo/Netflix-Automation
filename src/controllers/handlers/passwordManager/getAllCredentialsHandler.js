const passwordManagerService = require('../../../services/passwordManagerService');

/**
 * Handler pour récupérer tous les identifiants Netflix
 * Route: GET /api/netflix/credentials
 */
const getAllCredentialsHandler = async (req, res) => {
  try {
    // Utiliser le service générique sans filtre ni limite (ou une limite haute par défaut mais ici on veut tout)
    // getCredentials({}, null) => retourne Promise<Array>
    const credentials = await passwordManagerService.getCredentials({}, null);
    
    // Si vide, retourne tableau vide
    const data = credentials || [];

    return res.json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    console.error('❌ Erreur getAllCredentials:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des identifiants",
      error: error.message
    });
  }
};

module.exports = getAllCredentialsHandler;
