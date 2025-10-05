const express = require("express");
const cors = require("cors");
const healthRouter = require("./routes/health");
const sessionRouter = require("./routes/sessionRoutes");
const cookieRouter = require("./routes/cookieRoutes");
const pageRouter = require("./routes/pageRoutes");

// Configuration de l'application Express
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-session-id"],
  }),
);

// Routes
app.use("/health", healthRouter);
app.use("/api/netflix/session", sessionRouter);
app.use("/api/netflix", cookieRouter);
app.use("/api/netflix", pageRouter);

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route non trouvée",
    path: req.originalUrl,
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error("Erreur non gérée:", err);
  res.status(500).json({
    success: false,
    message: "Une erreur est survenue sur le serveur",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

module.exports = app;
