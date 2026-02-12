const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const healthRouter = require("./routes/health");
const sessionRouter = require("./routes/sessionRoutes");
const cookieRouter = require("./routes/cookieRoutes");
const pageRouter = require("./routes/pageRoutes");
const paymentRouter = require("./routes/paymentRoutes");
const userRouter = require("./routes/userRoutes");
const planActivationRouter = require("./routes/planActivationRoutes");
const subscriptionRouter = require("./routes/subscriptionRoutes");
const driveRouter = require("./routes/driveRoutes");

// Configuration de l'application Express
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration CORS - Accepte tout
app.use(
  cors({
    origin: "*", // Accepte toutes les origines
    methods: "*", // Accepte toutes les méthodes HTTP
    allowedHeaders: "*", // Accepte tous les headers
    exposedHeaders: "*", // Expose tous les headers
    credentials: true, // Autorise les credentials
  }),
);

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/health", healthRouter);
app.use("/api/netflix/session", sessionRouter);
app.use("/api/netflix", cookieRouter);
app.use("/api/netflix", pageRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/users", userRouter);
app.use("/api/plan-activation", planActivationRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/drive", driveRouter);
app.use("/api/netflix/plans", require("./routes/netflixPlanRoutes"));
app.use("/api/netflix", require("./routes/passwordManagerRoutes"));

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
  // console.error("Erreur non gérée:", err);
  res.status(500).json({
    success: false,
    message: "Une erreur est survenue sur le serveur",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

module.exports = app;
