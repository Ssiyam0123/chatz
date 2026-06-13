import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { Op } from 'sequelize';
import sequelize from './src/config/database.js';
import { initSocket } from './src/modules/socket/socket.handler.js';
import { Story, StoryViewer } from './src/models/index.js';

import authRoutes from './src/modules/auth/auth.route.js';
import chatRoutes from './src/modules/chat/chat.route.js';
import userRoutes from './src/modules/user/user.route.js';
import groupRoutes from './src/modules/group/group.route.js';
import uploadRoutes from './src/modules/upload/upload.route.js';
import friendRoutes from './src/modules/friend/friend.route.js';
import postRoutes from './src/modules/post/post.route.js';
import storyRoutes from './src/modules/story/story.route.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:8081',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.indexOf(origin) !== -1 ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.0.2.') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1')
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple Clean Request Logger
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

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/friends', friendRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/stories', storyRoutes);

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(`🔥 Error: ${err.message}`);
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

const io = initSocket(server);
app.set('io', io);

// Keep-alive ping for production
const keepAlive = (url) => {
  if (!url) return;
  setInterval(() => {
    axios
      .get(`${url}/health`)
      .then(() => console.log('🚀 Pinged server to stay awake!'))
      .catch((err) => console.log('⚠️ Ping error:', err.message));
  }, 10 * 60 * 1000);
};

const PORT = process.env.PORT || 5002; // Using 5002 to avoid conflict with original backend

// ─── Story Cleanup Job (runs every hour) ─────────────────────────────────────
const cleanupOldStories = async () => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const oldStories = await Story.findAll({
      where: { createdAt: { [Op.lt]: cutoff } },
      attributes: ['id'],
    });

    if (oldStories.length > 0) {
      const ids = oldStories.map((s) => s.id);
      await StoryViewer.destroy({ where: { storyId: { [Op.in]: ids } } });
      await Story.destroy({ where: { id: { [Op.in]: ids } } });
      console.log(`🧹 Cleaned up ${oldStories.length} expired stories`);
    }
  } catch (err) {
    console.error('⚠️ Story cleanup error:', err.message);
  }
};

sequelize
  .authenticate()
  .then(async () => {
    console.log('✅ PostgreSQL Connected Successfully');

    // Sync models (create tables if they don't exist)
    await sequelize.sync();
    console.log('✅ Database models synced');

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);

      // Start story cleanup (runs every hour)
      cleanupOldStories();
      setInterval(cleanupOldStories, 60 * 60 * 1000);

      if (process.env.NODE_ENV === 'production') {
        keepAlive(process.env.SERVER_URL);
      }
    });
  })
  .catch((err) => {
    console.error('❌ DB Connection Error:', err.message);
    process.exit(1);
  });
