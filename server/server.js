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

  // Start HTTP server
  const server = app.listen(PORT, () => {
    logger.info(`🚀 Blood Donor Finder API running on port ${PORT}`);
    logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 API: http://localhost:${PORT}/api`);
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
