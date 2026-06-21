import './src/config/env.js';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import pool from './src/config/pgDatabase.js';
import { initSocket } from './src/modules/socket/socket.handler.js';

import authRoutes from './src/modules/auth/auth.route.js';
import chatRoutes from './src/modules/chat/chat.route.js';
import userRoutes from './src/modules/user/user.route.js';
import groupRoutes from './src/modules/group/group.route.js';
import uploadRoutes from './src/modules/upload/upload.route.js';
import friendRoutes from './src/modules/friend/friend.route.js';
import postRoutes from './src/modules/post/post.route.js';
import storyRoutes from './src/modules/story/story.route.js';

const app = express();
const server = http.createServer(app);
const isDev = process.env.NODE_ENV !== 'production';

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: isDev ? false : undefined }));

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:8081',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.indexOf(origin) !== -1 ||
      // Permissive LAN origins only in dev.
      (isDev && (
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.0.2.') ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ))
    ) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// JSON body limit reduced: large payloads are a DoS vector.
// Image uploads go through multer (separate 5mb limit), not JSON.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.set('trust proxy', 1); // Trust Render proxy so IPs are parsed correctly

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { status: 'error', error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, try again later' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: 'error', error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts, try again later' } },
});

app.use(globalLimiter);

// ─── Request logger ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📡 ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/friends', friendRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/stories', storyRoutes);

// ─── Global error handler ────────────────────────────────────────────────────
// Produces the standard { status:'error', error:{ code, message } } envelope.
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || null;
  let message = err.message || 'Internal Server Error';

  // Sequelize validation errors → 400/409
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = err.name === 'SequelizeUniqueConstraintError' ? 409 : 400;
    code = code || (err.name === 'SequelizeUniqueConstraintError' ? 'CONFLICT' : 'VALIDATION_ERROR');
    message = err.errors?.map((e) => e.message).join(', ') || message;
  }

  // Zod validation errors (from the validate() middleware) → 422
  if (err.name === 'ZodError' && Array.isArray(err.issues)) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = err.issues.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`).join('; ');
  }

  if (statusCode >= 500) {
    console.error(`🔥 Error: ${err.message}`);
    if (isDev) console.error(err.stack);
  }

  res.status(statusCode).json({
    status: 'error',
    error: { code, message },
    ...(isDev ? { stack: err.stack } : {}),
  });
});

const io = initSocket(server);
app.set('io', io);

// ─── Keep-alive ping for production (opt-in) ──────────────────────────────────
const keepAlive = (url) => {
  if (!url) return;
  setInterval(() => {
    axios
      .get(`${url}/health`)
      .then(() => console.log('🚀 Pinged server to stay awake!'))
      .catch((err) => console.log('⚠️ Ping error:', err.message));
  }, 10 * 60 * 1000);
};

const PORT = process.env.PORT || 5002;

// ─── Story Cleanup Job (runs every hour) ─────────────────────────────────────
const cleanupOldStories = async () => {
  try {
    const { rows: oldStories } = await pool.query(
      "SELECT id FROM stories WHERE created_at < NOW() - INTERVAL '24 HOURS'"
    );

    if (oldStories.length > 0) {
      const ids = oldStories.map((s) => s.id);
      await pool.query('DELETE FROM story_viewers WHERE story_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM stories WHERE id = ANY($1)', [ids]);
      console.log(`🧹 Cleaned up ${oldStories.length} expired stories`);
    }
  } catch (err) {
    console.error('⚠️ Story cleanup error:', err.message);
  }
};

pool
  .query('SELECT 1')
  .then(async () => {
    console.log('✅ PostgreSQL Connected Successfully');

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);

      // Start story cleanup (runs every hour)
      cleanupOldStories();
      setInterval(cleanupOldStories, 60 * 60 * 1000);

      // Auto keep-alive: use SERVER_URL, Render's external URL, or fallback to chaz-backend.
      const serverUrl = process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || 'https://chaz-backend.onrender.com';
      if (process.env.KEEPALIVE_ENABLED === 'true' || process.env.RENDER_EXTERNAL_URL || serverUrl.includes('onrender')) {
        keepAlive(serverUrl);
      }
    });
  })
  .catch((err) => {
    console.error('❌ DB Connection Error:', err.message);
    process.exit(1);
  });
