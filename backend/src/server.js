


require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDatabase, getPool } = require('./config/db');
// Route imports
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');


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
app.use('/api/upload', uploadRoutes);

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
    console.log('[Server] Initializing Supabase PostgreSQL database...');

    try {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is missing from .env');
        }

        await initDatabase();

        console.log('[Server] Supabase database initialized successfully.');

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`[Server] Running on port ${PORT}`);
        });

      } catch (error) {
          console.error('[Server] Database initialization failed:', error);
          process.exit(1);
      }
}


startServer();
