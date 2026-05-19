import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';
import { initSocket } from './src/modules/socket/socket.handler.js';
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
  'https://your-app-name.vercel.app',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow local network origins for mobile development
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
const keepAlive = (url) => {
  if (!url) return;
  setInterval(() => {
    axios.get(`${url}/health`)
      .then(() => console.log('🚀 Pinged server to stay awake!'))
      .catch((err) => console.log('⚠️ Ping error:', err.message));
  }, 10 * 60 * 1000); 
};

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected Successfully');
    
    // Migration: Convert legacy likes arrays to reactions
    try {
      const Post = mongoose.model('Post');
      const legacyPosts = await Post.find({ likes: { $exists: true } });
      if (legacyPosts.length > 0) {
        console.log(`🚀 Migrating ${legacyPosts.length} legacy posts (likes -> reactions)...`);
        for (const post of legacyPosts) {
          if (post.likes && post.likes.length > 0) {
            const reactions = post.likes.map(userId => ({ user: userId, type: 'like' }));
            await Post.updateOne(
              { _id: post._id },
              { $set: { reactions }, $unset: { likes: "" } }
            );
          } else {
            await Post.updateOne({ _id: post._id }, { $unset: { likes: "" } });
          }
        }
        console.log('✅ Migration complete');
      }
    } catch (migErr) {
      console.log('⚠️ Migration notice:', migErr.message);
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      if (process.env.NODE_ENV === 'production') {
        keepAlive(process.env.SERVER_URL);
      }
    });
  })
  .catch(err => {
    console.error('❌ DB Connection Error:', err.message);
    process.exit(1); 
  });