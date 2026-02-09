/**
 * Service de gestion des mots de passe Netflix
 * Point d'entrée qui exporte toutes les méthodes de gestion des identifiants
 */
const passwordManagerService = {
  getCredentials: require('./passwordManager/getCredentials'),
  createCredentials: require('./passwordManager/createCredentials'),
  updateCredentials: require('./passwordManager/updateCredentials'),
  deleteCredentials: require('./passwordManager/deleteCredentials')
};

module.exports = passwordManagerService;
