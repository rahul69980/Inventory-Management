const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventorydb';

// Enhanced MongoDB connection configuration for Linux production
const connectDB = async () => {
  try {
    // Connection options for Linux production environment
    const options = {
      // Remove deprecated options for newer MongoDB driver
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority'
    };

    console.log('🔄 Connecting to MongoDB...');
    console.log(`📍 Database URI: ${MONGODB_URI.replace(/\/\/.*@/, '//*****@')}`); // Hide credentials in logs
    
    await mongoose.connect(MONGODB_URI, options);
    
    console.log('✅ MongoDB connected successfully!');
    console.log(`💾 Database: ${mongoose.connection.name}`);
    console.log(`🖥️  Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected successfully!');
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('💾 MongoDB connection closed through app termination');
      } catch (err) {
        console.error('❌ Error closing MongoDB connection:', err);
      }
    });
    
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    
    // Log specific connection issues for debugging
    if (err.name === 'MongoServerSelectionError') {
      console.error('🔍 Server selection failed. Check if MongoDB is running and accessible.');
      console.error('🔍 Ensure MongoDB service is started: sudo systemctl status mongod');
    }
    
    if (err.code === 'ENOTFOUND') {
      console.error('🔍 DNS resolution failed. Check MongoDB host in connection string.');
    }
    
    if (err.code === 'ECONNREFUSED') {
      console.error('🔍 Connection refused. MongoDB may not be running on specified port.');
    }
    
    // Don't exit process immediately, let the retry logic in server.js handle it
    throw err;
  }
};

// Function to check database connection status
const checkConnection = () => {
  return mongoose.connection.readyState === 1;
};

// Function to get connection info
const getConnectionInfo = () => {
  if (mongoose.connection.readyState === 1) {
    return {
      status: 'connected',
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    };
  }
  return {
    status: 'disconnected',
    readyState: mongoose.connection.readyState
  };
};

module.exports = {
  connectDB,
  checkConnection,
  getConnectionInfo
};
