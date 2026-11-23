/**
 * Génère un mot de passe aléatoire sécurisé
 * @param {number} length - Longueur du mot de passe
 * @returns {string} - Mot de passe généré
 */
const generateSecurePassword = (length = 12) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

module.exports = { generateSecurePassword };
