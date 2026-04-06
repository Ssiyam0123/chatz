import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from '../chat/message.model.js';

const onlineUsers = new Map();

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*' }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Auth error: No token provided'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Auth error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    onlineUsers.set(userId, socket.id);
    console.log(`📡 User online: ${userId}`);

    socket.on('send_message', async ({ receiverId, text }) => {
      try {
        const newMessage = await Message.create({
          sender: userId,
          receiver: receiverId,
          text
        });

        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_message', newMessage);
        }

        socket.emit('message_sent', newMessage);
        
      } catch (error) {
        console.error("❌ Message Send Error:", error.message);
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      console.log(`🔌 User offline: ${userId}`);
    });
  });
};