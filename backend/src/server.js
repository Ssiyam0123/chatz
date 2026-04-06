import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { initSocket } from './socket/socket.handler.js';
import authRoutes from './modules/auth/auth.route.js';
import chatRoutes from './modules/chat/chat.route.js';

dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/chat', chatRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  res.status(500).json({ status: 'error', message: err.message });
});

initSocket(server);

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('✅ DB Connected');
  server.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
}).catch(err => console.log('❌ DB Error:', err));