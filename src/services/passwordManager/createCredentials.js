const { db } = require('../../config/firebase');
const bcrypt = require('bcryptjs');
const { generateSecurePassword } = require('./helpers/passwordGenerator');
const addCredentialsToDb = require('./addCredentialsToDb'); // Service DB d'ajout
const getCredentials = require('./getCredentials'); // Service générique

/**
 * Crée de nouveaux identifiants Netflix
 * @param {string} userId - ID de l'utilisateur
 * @param {string} nom - Nom
 * @param {string} prenom - Prénom
 * @param {string} customEmail - Email personnalisé (optionnel)
 * @param {string} customPassword - Mot de passe personnalisé (optionnel)
 */
const createCredentials = async (userId, nom, prenom, customEmail = null, customPassword = null) => {
  // 1. Vérifier si l'utilisateur a déjà des identifiants via le service GET générique (par User ID)
  // 1. Génération de la logique métier (Email & Mot de passe)
  // Génération de l'email
  let email;
  if (customEmail) {
    email = customEmail;
  } else {
    const cleanNom = nom.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPrenom = prenom.toLowerCase().replace(/[^a-z0-9]/g, '');
    email = `${cleanPrenom}.${cleanNom}@moobilpay.com`;
  }

  // 2. Vérifier si cet EMAIL existe déjà (C'est la SEULE vérification qui compte)
  // Si l'email existe, on retourne les identifiants existants (peu importe le userId associé initialement)
  const existingEmail = await getCredentials({ email: email }, 1);

  if (existingEmail) {
    // console.log(`♻️ Email ${email} existe déjà. Réutilisation des identifiants.`);
    return {
      ...existingEmail,
      password: existingEmail.password_text,
      isNew: false
    };
  }
  
  // 4. Si ni user ni email n'existent, on crée tout à neuf
  const plainPassword = customPassword || generateSecurePassword(10);
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const newCredentials = {
    user_id: userId,
    email: email,
    password_hash: hashedPassword,
    password_text: plainPassword,
    nom: nom,
    prenom: prenom,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 5. Appel au service dédié pour l'insertion en base
  const created = await addCredentialsToDb(newCredentials);
  
  return {
    ...created,
    password: plainPassword, // Pour compatibilité frontend ('password' vs 'password_text')
    isNew: true
  };
};

module.exports = createCredentials;
