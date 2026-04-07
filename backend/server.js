import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { initSocket } from './src/modules/socket/socket.handler.js';
import authRoutes from './src/modules/auth/auth.route.js';
import chatRoutes from './src/modules/chat/chat.route.js';
import userRoutes from './src/modules/user/user.route.js';

dotenv.config();
const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/user', userRoutes);   // ✅ added user profile routes

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ status: 'error', message: err.message });
});

// Socket.io initialization
initSocket(server);

const PORT = process.env.PORT || 5001;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ DB Connected');
    server.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
  })
  .catch(err => console.log('❌ DB Error:', err));