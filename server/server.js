/**
 * Server Entry Point
 * Bootstraps database, VAPID config, and starts HTTP server
 */
require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { initVapid } = require('./config/vapid');
const logger = require('./utils/logger');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Initialize VAPID keys for push notifications
  initVapid();

  // Start HTTP server (bind to 0.0.0.0 for Render compatibility)
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Pranadatha API running on port ${PORT}`);
    logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 API: http://localhost:${PORT}/api`);

    // ── Keep-alive ping (prevents Render free tier sleep) ─────────────────
    // Only active in production. Pings /api/health every 3 minutes.
    if (process.env.NODE_ENV === 'production') {
      const https = require('https');
      const PING_URL = 'https://pranadathabackend.onrender.com/api/health';
      const PING_INTERVAL = 2 * 60 * 1000; // 3 minutes

      setInterval(() => {
        https.get(PING_URL, (res) => {
          logger.info(`🏓 Keep-alive ping → ${res.statusCode}`);
        }).on('error', (err) => {
          logger.warn(`🏓 Keep-alive ping failed: ${err.message}`);
        });
      }, PING_INTERVAL);

      logger.info(`🏓 Keep-alive ping active (every 3 min) → ${PING_URL}`);
    }
  });

  // Graceful shutdown handlers
  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      mongoose.connection.close().then(() => {
        logger.info('MongoDB connection closed.');
        process.exit(0);
      });
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Promise Rejection: ${reason}`);
    shutdown('Unhandled rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    shutdown('Uncaught exception');
  });
};

startServer();
