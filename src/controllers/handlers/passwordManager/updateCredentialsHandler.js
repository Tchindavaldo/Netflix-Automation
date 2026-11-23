const passwordManagerService = require('../../../services/passwordManagerService');

/**
 * Handler pour mettre à jour les identifiants Netflix
 * Route: PUT /api/netflix/credentials/:id
 */
const updateCredentialsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const credentials = await passwordManagerService.updateCredentials(id, updateData);

    return res.json({
      success: true,
      message: "Identifiants mis à jour avec succès",
      data: credentials
    });
  } catch (error) {
    console.error('❌ Erreur updateCredentials:', error);
    if (error.message.includes('Aucun identifiant trouvé')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour des identifiants",
      error: error.message
    });
  }
};

module.exports = updateCredentialsHandler;
