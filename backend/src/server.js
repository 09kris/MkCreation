const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { initDatabase, getPool } = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    console.log('[Health Check] Database connection successful.');
  } catch (e) {
    console.error('[Health Check] Database connection failed:', e.message);
    return res.status(503).json({
      status: 'degraded',
      appName: 'Poojapa Spiritual Store API',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      roles: ['customer', 'admin'],
    });
  }

  res.json({
    status: 'online',
    appName: 'Poojapa Spiritual Store API',
    database: 'connected',
    timestamp: new Date().toISOString(),
    roles: ['customer', 'admin'],
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Root Welcome Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Poojapa Store Backend API',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      categories: '/api/categories',
      products: '/api/products',
      orders: '/api/orders',
      admin: '/api/admin',
    },
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
  });
});

// Start Server and Initialize Database
async function startServer() {
  console.log(`[Server] Initializing ${process.env.DB_TYPE || 'mysql'} database...`);
  try {
    await initDatabase();
    console.log('[Server] Database initialized successfully.');
  } catch (err) {
    console.error('[Server] Database initialization failed:', err.message);
    if ((process.env.DB_TYPE || 'mysql').toLowerCase() === 'supabase') {
      console.error('[Server] Verify DB_TYPE=supabase, DATABASE_URL in the Render environment, and Supabase network access.');
    } else {
      console.error('[Server] Verify the MySQL service and DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD.');
    }
    process.exitCode = 1;
    return;
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` Poojapa Store API Server running on port ${PORT}`);
    console.log(` Local:            http://localhost:${PORT}`);
    console.log(` Health Check:     http://localhost:${PORT}/api/health`);
    console.log(` Customer & Admin Roles: Ready`);
    console.log(`====================================================`);
  });
}

startServer();
