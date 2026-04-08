import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from '../chat/message.model.js';
import User from '../user/user.model.js';

const userSockets = new Map();

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*' }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log('❌ Socket auth failed: no token');
      return next(new Error('Auth error: missing token'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, iat, exp }
      console.log(`🔑 Socket authenticated for user ${socket.user.id}`);
      next();
    } catch (err) {
      console.log('❌ Socket auth failed: invalid token');
      next(new Error('Auth error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    
    // Store socket id for this user
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    console.log(`✅ User ${userId} connected. Active sockets: ${Array.from(userSockets.get(userId)).join(', ')}`);

    socket.emit('connected', { userId });


    socket.on('send_message', async ({ receiverId, text, clientId }) => {
      console.log(`📨 Message from ${userId} to ${receiverId}: "${text}" (clientId: ${clientId})`);
      try {
        // Save message to database
        const newMessage = await Message.create({
          sender: userId,
          receiver: receiverId,
          text
        });

        // Populate sender info (name, avatar)
        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'name avatar')
          .exec();

     
        const senderDetails = await User.findById(userId).select('name avatar');
        const receiverDetails = await User.findById(receiverId).select('name avatar');

      
        const conversationForReceiver = {
          _id: userId,
          lastMessage: text,
          lastMessageTime: newMessage.createdAt,
          userDetails: {
            _id: userId,
            name: senderDetails.name,
            avatar: senderDetails.avatar
          }
        };

  
        const conversationForSender = {
          _id: receiverId,
          lastMessage: text,
          lastMessageTime: newMessage.createdAt,
          userDetails: {
            _id: receiverId,
            name: receiverDetails.name,
            avatar: receiverDetails.avatar
          }
        };

        // Send to receiver if online
        const receiverSockets = userSockets.get(receiverId);
        if (receiverSockets && receiverSockets.size > 0) {
          console.log(`📤 Sending to receiver ${receiverId} (${receiverSockets.size} sockets)`);
          for (const socketId of receiverSockets) {
            io.to(socketId).emit('receive_message', populatedMessage);
            io.to(socketId).emit('conversation_update', conversationForReceiver);
          }
        } else {
          console.log(`⚠️ Receiver ${receiverId} is offline`);
        }

      
        const messageWithClientId = {
          ...populatedMessage.toObject(),
          clientId
        };
        socket.emit('message_sent', messageWithClientId);
        
        // Also update sender's own conversation list
        socket.emit('conversation_update', conversationForSender);

      } catch (error) {
        console.error("Socket Message Error:", error.message);
        socket.emit('message_error', { clientId, error: error.message });
      }
    });

    socket.on('typing', ({ receiverId, isTyping }) => {
      const receiverSockets = userSockets.get(receiverId);
      if (receiverSockets) {
        for (const socketId of receiverSockets) {
          io.to(socketId).emit('user_typing', { userId, isTyping });
        }
      }
    });

    socket.on('disconnect', () => {
      const userSocketsSet = userSockets.get(userId);
      if (userSocketsSet) {
        userSocketsSet.delete(socket.id);
        if (userSocketsSet.size === 0) {
          userSockets.delete(userId);
        }
      }
      console.log(`❌ User ${userId} disconnected. Remaining sockets: ${userSockets.get(userId)?.size || 0}`);
    });
  });
};