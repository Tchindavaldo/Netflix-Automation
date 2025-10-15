const notificationHandler = require('./src/services/notification/socket/notificationHandler');

// src/socket.js
let io;
const readNotificationsBuffer = [];

module.exports = {
  init: server => {
    io = require('socket.io')(server, {
      cors: {
        origin: '*',
        methods: ['*'],
        allowedHeaders: ['*'],
        credentials: true,
      },
      // Configuration optimisée pour Cloud Run
      pingTimeout: 120000,        // 2 minutes (au lieu de 5s par défaut)
      pingInterval: 25000,        // Ping toutes les 25s (garder la connexion active)
      upgradeTimeout: 30000,      // 30s pour l'upgrade vers WebSocket
      maxHttpBufferSize: 1e8,     // 100MB pour les gros messages
      transports: ['websocket', 'polling'], // Essayer WebSocket en priorité
      allowEIO3: true,            // Compatibilité avec anciens clients
      
      // Reconnexion automatique
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      
      // Logging pour debug
      ...(process.env.NODE_ENV !== 'production' && {
        connectTimeout: 45000,
      })
    });

    io.on('connection', socket => {
      console.log('🟢 Client connecté:', socket.id);
      socket.on('join_user', userId => {
        socket.join(userId);
        console.log(`🔐 Socket ${socket.id} a rejoint la room user: ${userId}`);
      });
      socket.on('disconnect', () => {
        console.log('🔴 Client déconnecté:', socket.id);
      });

      // ➕ Utilise le handler ici
      notificationHandler(socket, io);
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io non initialisé !');
    }
    return io;
  },
};
