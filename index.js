// Charge les variables d'environnement en fonction de NODE_ENV
if (process.env.NODE_ENV === "production") {
  require("dotenv").config({ path: ".env.prod" }); // Pour la production
} else {
  require("dotenv").config({ path: ".env.dev" }); // Pour le développement
}

const express = require("express");
const cors = require("cors"); // Assurez-vous d'importer le package cors
const { PlaywrightService } = require("./playwrightService");

const { PuppeteerService } = require("./puppeteerService");
const puppeteerService = new PuppeteerService();

const app = express();
const PORT = 3000;
const playwrightService = new PlaywrightService();

// Utiliser express.json() pour parser les requêtes avec body en JSON
app.use(express.json());

// Configurer CORS pour permettre toutes les origines
app.use(
  cors({
    origin: "*", // '*' autorise toutes les origines. Si tu veux autoriser juste certaines origines, remplace par l'URL spécifique.
    methods: ["GET", "POST", "PUT", "DELETE"], // Méthodes autorisées
    allowedHeaders: ["Content-Type"], // En-têtes autorisés
  })
);

app.get("/health", (req, res) => {
  console.log("status verifier ok avec success");
  res.status(200).send("OK");
});

// Route pour le formulaire
app.post("/api/fill-form", async (req, res) => {
  const { url, data } = req.body;
  try {
    // Appel à la méthode fillForm dans le service Playwright
    // const result = await playwrightService.fillForm( url, data );
    const result = await puppeteerService.fillForm(url, data); // puppeteerService au lieu de playwrightService

    res.status(200).json({ success: true, result }); // Réponse de succès avec le résultat
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "An error occurred" });
  }
});

// Lancer le serveur sur le port 3000
app.listen(PORT, () => {
  console.log("Server is running on port ", PORT);
});
