import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db } from './db/config.js';
import { mainRouter } from './src/api/routes.js';
import { errorHandler } from './src/middleware/error-handler.js';

const app = express();
const port = process.env.PORT || 3777;

// ============================================================
// CORS
// ============================================================
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow tools like curl/Postman (no origin) and listed sites
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// HEALTH CHECKS
// ============================================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/health', async (req, res) => {
  try {
    const connection = await db.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    console.error('DB health error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================
// ROUTES
// ============================================================
app.use('/api', mainRouter);

app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

db.getConnection()
  .then(connection => {
    console.log('Database connection established successfully.');
    connection.release();
  })
  .catch(error => {
    console.error('Database connection failed:', error.message);
  });