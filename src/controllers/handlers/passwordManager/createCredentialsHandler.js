const passwordManagerService = require('../../../services/passwordManagerService');

/**
 * Handler pour créer de nouveaux identifiants Netflix
 * Route: POST /api/netflix/credentials/create
 */
const createCredentialsHandler = async (req, res) => {
  try {
    const { userId, nom, prenom, email, password } = req.body;

    if (!userId || !nom || !prenom) {
      return res.status(400).json({
        success: false,
        message: "UserId, nom et prénom sont requis"
      });
    }

    const credentials = await passwordManagerService.createCredentials(
      userId, 
      nom, 
      prenom, 
      email, 
      password
    );

    return res.status(201).json({
      success: true,
      message: "Identifiants créés avec succès",
      data: credentials
    });
  } catch (error) {
    console.error('❌ Erreur createCredentials:', error);
    if (error.message.includes('possède déjà des identifiants')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la création des identifiants",
      error: error.message
    });
  }
};

module.exports = createCredentialsHandler;
