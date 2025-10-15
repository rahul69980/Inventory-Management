const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require('fs');

const session = require('express-session');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
require('dotenv').config();

const app = express();

// Create necessary directories for Linux deployment
const createDirectories = () => {
  const dirs = [
    path.join(__dirname, 'logs'),
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'temp')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

// Create directories on startup
createDirectories();

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for Linux
const { connectDB } = require("./db");

// Enhanced error handling for production
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  console.error('Shutting down gracefully...');
  process.exit(1);
});

process.on('unhandledRejection', (err, promise) => {
  console.error('🔥 Unhandled Promise Rejection:', err);
  console.error('Shutting down gracefully...');
  server.close(() => {
    process.exit(1);
  });
});

// Connect to MongoDB with retry logic
const initializeDatabase = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    console.log('🔄 Retrying database connection in 5 seconds...');
    setTimeout(initializeDatabase, 5000);
  }
};

initializeDatabase();

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'inventory-management-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,  // Always false for HTTP
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Body parsing middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Make io available to routes
app.set('io', io);

// Middleware to add user data to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAuthenticated = !!req.session.user;
  next();
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
};

// Redirect middleware for login/signup access
app.get('/login', (req, res) => {
  res.redirect('/auth/login');
});

app.get('/signup', (req, res) => {
  res.redirect('/auth/signup');
});

// Routes
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const apiRoutes = require('./routes/api');

app.use('/auth', authRoutes);
app.use('/inventory', requireAuth, inventoryRoutes);
app.use('/api', requireAuth, apiRoutes);

// Public routes
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/home');
  }
  res.render('index');
});


// Protected routes
app.get('/home', requireAuth, (req, res) => {
  res.render('home', { 
    userName: req.session.user.firstName || req.session.user.username
  });
});

app.get('/add-item', requireAuth, (req, res) => {
  res.render('add-item');
});

app.get('/inventory-list', requireAuth, (req, res) => {
  res.render('inventory-list');
});

app.get('/alerts', requireAuth, (req, res) => {
  res.render('alerts');
});

app.get('/edit-item', requireAuth, (req, res) => {
  res.render('edit-item');
});

app.get('/hazardous-materials', requireAuth, (req, res) => {
  res.render('hazardous-materials');
});

app.get('/items-available', requireAuth, (req, res) => {
  res.render('items-available');
});

app.get('/low-stock', requireAuth, (req, res) => {
  res.render('low-stock');
});

app.get('/reserved-items', requireAuth, (req, res) => {
  res.render('reserved-items');
});

app.get('/transaction-log', requireAuth, (req, res) => {
  res.render('transaction-log');
});

// Profile and Settings routes
app.get('/profile', requireAuth, (req, res) => {
  res.render('profile', {
    user: req.session.user
  });
});

app.get('/settings', requireAuth, (req, res) => {
  res.render('settings', {
    user: req.session.user
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.redirect('/');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { 
    message: 'Page not found'
  });
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Graceful shutdown handler for Linux
const gracefulShutdown = (signal) => {
  console.log(`\n📴 Received ${signal}. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('🔌 HTTP server closed.');
    
    // Close database connection
    require('mongoose').connection.close(() => {
      console.log('💾 Database connection closed.');
      console.log('👋 Process terminated gracefully.');
      process.exit(0);
    });
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('⚡ Forceful shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Listen for termination signals (Linux)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server - bind to all interfaces for Linux hosting
server.listen(PORT, HOST, () => {
  console.log(`✅ Server running on ${HOST}:${PORT}`);
  console.log(`🌐 Access via: http://${HOST === '0.0.0.0' ? 'your-server-ip' : HOST}:${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/inventorydb'}`);
  console.log(`📁 Logs directory: ${path.join(__dirname, 'logs')}`);
  console.log(`📂 Uploads directory: ${path.join(__dirname, 'uploads')}`);
});
