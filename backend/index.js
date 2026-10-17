
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
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from tools such as curl and Postman.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    console.error('Database health check failed:', error.message);

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
// ERROR HANDLER
// Keep this after the routes.
// ============================================================
app.use(errorHandler);

// ============================================================
// START SERVER AND INITIALIZE DATABASE
// ============================================================
async function startServer() {
  try {
    // Verify database connectivity before starting the server.
    const connection = await db.getConnection();
    connection.release();

    console.log('Database connection established successfully.');

    // Create or initialize the required database tables.
    await initDb();
    console.log('Database tables initialized successfully.');

    // Start accepting requests only after successful initialization.
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start the application:', error.message);
    process.exit(1);
  }
}

startServer();
