/**
 * MongoDB Connection Configuration
 * Uses Mongoose with connection pooling and retry logic
 */
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

      // Handle connection events
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB connection error: ${err.message}`);
      });

      return;
    } catch (error) {
      retries++;
      logger.error(`MongoDB connection attempt ${retries} failed: ${error.message}`);
      if (retries === maxRetries) {
        logger.error('All MongoDB connection attempts failed. Exiting...');
        process.exit(1);
      }
      // Wait 2 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};

module.exports = connectDB;
