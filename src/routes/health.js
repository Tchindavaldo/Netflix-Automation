const express = require('express');
const router = express.Router();

// Vérification de l'état du serveur
router.get('/', (req, res) => {
  console.log("Vérification de l'état du serveur - OK");
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "Netflix Automation API",
    version: process.env.npm_package_version || "1.0.0"
  });
});

module.exports = router;
