/**
 * Contrôleur pour la gestion des mots de passe et identifiants Netflix
 * Ce fichier sert de point d'entrée pour les routes de gestion des identifiants
 * et délègue le traitement aux gestionnaires spécifiques.
 */
const passwordManagerController = {
  // GET - Récupérer tous les identifiants
  getAllCredentials: require('./handlers/passwordManager/getAllCredentialsHandler'),
  
  // GET - Récupérer les identifiants par userId
  getCredentialsByUserId: require('./handlers/passwordManager/getCredentialsByUserIdHandler'),
  
  // GET - Récupérer les identifiants par ID
  getCredentialsById: require('./handlers/passwordManager/getCredentialsByIdHandler'),
  
  // POST - Créer de nouveaux identifiants
  createCredentials: require('./handlers/passwordManager/createCredentialsHandler'),
  
  // PUT - Mettre à jour les identifiants
  updateCredentials: require('./handlers/passwordManager/updateCredentialsHandler'),
  
  // DELETE - Supprimer les identifiants
  deleteCredentials: require('./handlers/passwordManager/deleteCredentialsHandler'),
  
  // POST - Endpoint legacy pour gérer (get ou create) les identifiants
  handleNetflixCredentials: require('./handlers/passwordManager/handleNetflixCredentialsHandler')
};

module.exports = passwordManagerController;
