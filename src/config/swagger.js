const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Netflix Automation API',
      version: '1.0.0',
      description: 'API pour l\'automatisation Netflix',
      contact: {
        name: 'Netflix Automation Team',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://api.example.com', description: 'Production' },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '../routes/health.js'),
    path.join(__dirname, '../routes/sessionRoutes.js'),
    path.join(__dirname, '../routes/cookieRoutes.js'),
    path.join(__dirname, '../routes/pageRoutes.js'),
    path.join(__dirname, '../routes/paymentRoutes.js'),
    path.join(__dirname, '../routes/userRoutes.js'),
    path.join(__dirname, '../routes/planActivationRoutes.js'),
    path.join(__dirname, '../routes/subscriptionRoutes.js'),
    path.join(__dirname, '../routes/driveRoutes.js'),
  ],
};

module.exports = swaggerJsdoc(options);
