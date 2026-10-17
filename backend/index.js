
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { initDb } from './db/init.js';
import { db } from './db/config.js';
import { mainRouter } from './src/api/routes.js';
import { errorHandler } from './src/middleware/error-handler.js';

const app = express();
const port = process.env.PORT || 3777;

// ============================================================
// CORS CONFIGURATION
// ============================================================

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://firdosevangadforum.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
]
  .filter(Boolean)
  .map((origin) => origin.trim().replace(/\/+$/, ''));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (e.g. health checks).
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.error('CORS blocked origin:', origin);

      return callback(
        new Error(`CORS blocked origin: ${origin}`)
      );
    },
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

// ============================================================
// GENERAL MIDDLEWARE
// ============================================================

app.use(express.json({ limit: '10mb' }));
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// ============================================================
// ROOT ROUTE
// ============================================================

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'AI-Powered Evangadi Forum API is running!',
    status: 'success',
    endpoints: {
      root: '/',
      health: '/health',
      databaseHealth: '/api/health',
      api: '/api',
      login: '/api/auth/login',
    },
  });
});

// ============================================================
// GENERAL HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'AI-Powered Evangadi Forum API',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// DATABASE HEALTH CHECK
// ============================================================

app.get('/api/health', async (req, res) => {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.query('SELECT 1');

    return res.status(200).json({
      ok: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      'Database health check failed:',
      error.message
    );

    return res.status(500).json({
      ok: false,
      database: 'disconnected',
      message: 'Database health check failed.',
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ============================================================
// API ROUTES
// ============================================================

app.use('/api', mainRouter);

// ============================================================
// 404 HANDLER
// Keep this before the general error handler.
// ============================================================

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ============================================================
// CENTRAL ERROR HANDLER
// ============================================================

app.use(errorHandler);

// ============================================================
// START SERVER AND INITIALIZE DATABASE
// ============================================================

async function startServer() {
  try {
    // Verify database connectivity.
    let connection = await db.getConnection();
    connection.release();
    connection = null;

    console.log(
      'Database connection established successfully.'
    );

    // Initialize database tables.
    await initDb();

    console.log(
      'Database tables initialized successfully.'
    );

    // Start the server after successful initialization.
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
      console.log(
        'Allowed frontend origins:',
        allowedOrigins
      );
    });
  } catch (error) {
    console.error(
      'Failed to start the application:',
      error.message
    );

    process.exit(1);
  }
}

startServer();
