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
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/user', userRoutes);

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
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
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