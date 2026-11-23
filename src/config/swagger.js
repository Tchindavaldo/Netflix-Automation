const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MoobilPay — Netflix Automation API',
      version: '1.1.12',
      description: `
API REST pour la plateforme MoobilPay : gestion des abonnements Netflix, paiements Mobile Money,
utilisateurs Firebase, notifications push FCM, credentials Netflix et activation de plans.

**URL dev :** http://localhost:3000 | **URL prod :** http://localhost:5000

**Socket.io :** Les endpoints d'abonnement et d'activation émettent des événements temps réel vers la room \`userId\`.
      `,
      contact: {
        name: 'MoobilPay Team',
        email: 'michael@moobilpay.com',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Développement (PORT=3000)' },
      { url: 'http://localhost:5000', description: 'Production (PORT=5000)' },
    ],
    tags: [
      { name: 'Health', description: 'Santé du serveur' },
      { name: 'Users', description: 'Gestion des utilisateurs Firebase' },
      { name: 'Plan Activation', description: 'Activation et suivi des plans Netflix' },
      { name: 'Subscription', description: "Processus d'abonnement Netflix (polling paiement + orchestration Selenium)" },
      { name: 'Payment', description: 'Paiements Mobile Money (Orange Money / Digikuntz)' },
      { name: 'Transactions', description: 'Historique des transactions utilisateur' },
      { name: 'Netflix Plans', description: 'Plans Netflix disponibles (prix, durée, qualité)' },
      { name: 'Netflix Credentials', description: 'Identifiants comptes Netflix par utilisateur' },
      { name: 'Notifications', description: 'Notifications push FCM et base de données Firestore' },
      { name: 'Drive', description: 'Upload de snapshots vers Google Drive' },
    ],
    components: {
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Opération réussie' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Erreur survenue' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 25 },
            limit: { type: 'integer', example: 10 },
            offset: { type: 'integer', example: 0 },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'NgOcjUW5nZgdEpVMeVyQyYRQgIS2' },
            uid: { type: 'string', example: 'NgOcjUW5nZgdEpVMeVyQyYRQgIS2' },
            email: { type: 'string', example: 'user@exemple.com' },
            displayName: { type: 'string', example: 'Jean Dupont' },
            photoURL: { type: 'string' },
            fcmToken: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PlanActivation: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'qYezJqfDzJuBzZJVyQjW' },
            userId: { type: 'string', example: 'NgOcjUW5nZgdEpVMeVyQyYRQgIS2' },
            planNetflix: { type: 'string', enum: ['mobile', 'basic', 'standard', 'premium'], example: 'premium' },
            amount: { type: 'number', example: 25000 },
            statut: { type: 'string', enum: ['pending', 'activated', 'expired', 'failed'], example: 'pending' },
            reqteStatusSuccess: { type: 'string', enum: ['pending', 'failed', 'success'], example: 'success' },
            numeroOM: { type: 'string', example: '237699000000' },
            email: { type: 'string', example: 'user@exemple.com' },
            typePaiement: { type: 'string', example: 'mobile_money' },
            dureePlan: { type: 'integer', example: 30 },
            joursMarge: { type: 'integer', example: 2 },
            dateDebut: { type: 'string', format: 'date-time' },
            dateExpiration: { type: 'string', format: 'date-time' },
            dateCreation: { type: 'string', format: 'date-time' },
            dateModification: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            planActivationId: { type: 'string' },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'success', 'failed'] },
            externalTransactionId: { type: 'string' },
            dateCreation: { type: 'string', format: 'date-time' },
          },
        },
        NetflixPlan: {
          type: 'object',
          properties: {
            id: { type: 'string', enum: ['mobile', 'basic', 'standard', 'premium'], example: 'premium' },
            name: { type: 'string', example: 'Premium' },
            title: { type: 'string', example: "Plan Premium - L'expérience ultime" },
            price: { type: 'number', example: 25000 },
            currency: { type: 'string', example: 'XAF' },
            quality: { type: 'string', example: 'Exceptionnelle' },
            resolution: { type: 'string', example: '4K Ultra HD' },
            simultaneous: { type: 'integer', example: 4 },
            downloads: { type: 'integer', example: 6 },
            active: { type: 'boolean', example: true },
          },
        },
        NetflixCredentials: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            email: { type: 'string', example: 'user@moobilpay.com' },
            password_text: { type: 'string' },
            nom: { type: 'string' },
            prenom: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            idGroup: { type: 'string' },
            title: { type: 'string' },
            body: { type: 'string' },
            type: { type: 'string', enum: ['info', 'success', 'warning', 'error'] },
            isRead: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        SubscriptionError: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            stepName: { type: 'string' },
            error: { type: 'string' },
            userId: { type: 'string' },
            planActivationId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            hasSnapshot: { type: 'boolean' },
            hasCardInfo: { type: 'boolean' },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '../routes/health.js'),
    path.join(__dirname, '../routes/userRoutes.js'),
    path.join(__dirname, '../routes/planActivationRoutes.js'),
    path.join(__dirname, '../routes/subscriptionRoutes.js'),
    path.join(__dirname, '../routes/paymentRoutes.js'),
    path.join(__dirname, '../routes/transactionRoutes.js'),
    path.join(__dirname, '../routes/netflixPlanRoutes.js'),
    path.join(__dirname, '../routes/passwordManagerRoutes.js'),
    path.join(__dirname, '../routes/notificationRoutes.js'),
    path.join(__dirname, '../routes/driveRoutes.js'),
  ],
};

module.exports = swaggerJsdoc(options);
