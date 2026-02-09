const passwordManagerService = require('../../../services/passwordManagerService');

/**
 * Handler pour supprimer les identifiants Netflix
 * Route: DELETE /api/netflix/credentials/:id
 */
const deleteCredentialsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await passwordManagerService.deleteCredentials(id);

    return res.json({
      success: true,
      message: "Identifiants supprimés avec succès",
      data: result
    });
  } catch (error) {
    console.error('❌ Erreur deleteCredentials:', error);
    if (error.message.includes('Aucun identifiant trouvé')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression des identifiants",
      error: error.message
    });
  }
};

module.exports = deleteCredentialsHandler;
