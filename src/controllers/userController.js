const userService = require('../services/userService');

/**
 * Contrôleur des utilisateurs
 * Ce fichier sert de point d'entrée pour les routes utilisateur
 * et délègue le traitement au service spécifique.
 */

// Récupérer tous les utilisateurs
const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs',
      error: error.message
    });
  }
};

// Récupérer un utilisateur par ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    res.status(200).json({
      success: true,
      exists: true,
      data: user
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    // Vérifier si l'erreur est due à l'absence de l'utilisateur
    if (error.message.includes('Aucun utilisateur trouvé')) {
      res.status(404).json({
        success: false,
        exists: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'utilisateur',
        error: error.message
      });
    }
  }
};

// Récupérer un utilisateur par UID
const getUserByUID = async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await userService.getUserByUID(uid);
    res.status(200).json({
      success: true,
      exists: true,
      data: user
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur par UID:', error);
    // Vérifier si l'erreur est due à l'absence de l'utilisateur
    if (error.message.includes('Aucun utilisateur trouvé')) {
      res.status(404).json({
        success: false,
        exists: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'utilisateur par UID',
        error: error.message
      });
    }
  }
};

// Récupérer un utilisateur par email
const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await userService.getUserByEmail(email);
    res.status(200).json({
      success: true,
      exists: true,
      data: user
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur par email:', error);
    // Vérifier si l'erreur est due à l'absence de l'utilisateur
    if (error.message.includes('Aucun utilisateur trouvé')) {
      res.status(404).json({
        success: false,
        exists: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'utilisateur par email',
        error: error.message
      });
    }
  }
};

// Créer un nouvel utilisateur
const createUser = async (req, res) => {
  try {
    const userData = req.body;
    const userId = await userService.createUser(userData);
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: { id: userId, ...userData }
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur',
      error: error.message
    });
  }
};

// Mettre à jour un utilisateur
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    const updatedUser = await userService.updateUser(id, userData);
    res.status(200).json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      data: updatedUser
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'utilisateur',
      error: error.message
    });
  }
};

// Supprimer un utilisateur
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    res.status(200).json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'utilisateur',
      error: error.message
    });
  }
};

const userController = {
  getAllUsers,
  getUserById,
  getUserByUID,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser
};

module.exports = userController;
