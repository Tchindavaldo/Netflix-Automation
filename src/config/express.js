const express = require("express");
const cors = require("cors");

const configureExpress = () => {
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

  return app;
};

module.exports = configureExpress;
