import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from '../chat/message.model.js';
import User from '../user/user.model.js';
import Group from '../group/group.model.js';
import GroupMessage from '../group/groupMessage.model.js';

const userSockets = new Map();

// Safely serialize a Mongoose document so all ObjectIds become strings.
// This prevents crashes in the client's keyExtractor / comparison logic.
const serialize = (doc) => {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  // Recursively convert ObjectId values to strings
  const walk = (o) => {
    if (o === null || o === undefined) return o;
    if (Array.isArray(o)) return o.map(walk);
    if (typeof o === 'object' && o.constructor?.name === 'ObjectId') return o.toString();
    if (typeof o === 'object') {
      const out = {};
      for (const k of Object.keys(o)) out[k] = walk(o[k]);
      return out;
    }
    return o;
  };
  return walk(obj);
};

// BUG FIX helper: ObjectId[] vs string comparison
const isMember = (members, userId) =>
  members.some((m) => m.toString() === userId.toString());

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*' },
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
      socket.user = decoded;
      console.log(`🔑 Socket authenticated for user ${socket.user.id}`);
      next();
    } catch (err) {
      console.log('❌ Socket auth failed: invalid token');
      next(new Error('Auth error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    console.log(`✅ User ${userId} connected. Sockets: ${userSockets.get(userId).size}`);

    socket.emit('connected', { userId });

    // ─── Direct Messages ────────────────────────────────────────────────────

    socket.on('send_message', async ({ receiverId, text, image, ciphertext, nonce, isEncrypted, clientId }) => {
      console.log(`📨 DM from ${userId} to ${receiverId} clientId=${clientId} encrypted=${!!isEncrypted}`);
      try {
        // Friend request system guard
        const senderUser = await User.findById(userId);
        if (!senderUser || !senderUser.friends.includes(receiverId)) {
          return socket.emit('message_error', {
            message: "You can only send messages to users who are in your friends list.",
            clientId
          });
        }

        const newMessage = await Message.create({
          sender: userId,
          receiver: receiverId,
          text: text || '',
          image: image || null,
          ciphertext: ciphertext || null,
          nonce: nonce || null,
          isEncrypted: !!isEncrypted,
        });

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'name avatar publicKey')
          .exec();

        const senderDetails = await User.findById(userId).select('name avatar');
        const receiverDetails = await User.findById(receiverId).select('name avatar');

        const serialized = serialize(populatedMessage);

        const conversationForReceiver = {
          _id: userId,
          lastMessage: isEncrypted ? '🔒 Encrypted Message' : (image ? '📷 Image' : text),
          lastMessageTime: newMessage.createdAt,
          lastMessageImage: image || null,
          lastMessageCiphertext: ciphertext || null,
          lastMessageNonce: nonce || null,
          lastMessageIsEncrypted: !!isEncrypted,
          userDetails: {
            _id: userId,
            name: senderDetails.name,
            avatar: senderDetails.avatar,
          },
        };

        const conversationForSender = {
          _id: receiverId,
          lastMessage: isEncrypted ? '🔒 Encrypted Message' : (image ? '📷 Image' : text),
          lastMessageTime: newMessage.createdAt,
          lastMessageImage: image || null,
          lastMessageCiphertext: ciphertext || null,
          lastMessageNonce: nonce || null,
          lastMessageIsEncrypted: !!isEncrypted,
          userDetails: {
            _id: receiverId,
            name: receiverDetails?.name,
            avatar: receiverDetails?.avatar,
          },
        };

        const receiverSockets = userSockets.get(receiverId);
        if (receiverSockets && receiverSockets.size > 0) {
          for (const socketId of receiverSockets) {
            io.to(socketId).emit('receive_message', serialized);
            io.to(socketId).emit('conversation_update', conversationForReceiver);
          }
        }

        socket.emit('message_sent', { ...serialized, clientId });
        socket.emit('conversation_update', conversationForSender);
      } catch (error) {
        console.error('Socket Message Error:', error.message);
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

    // ─── Group Messages ─────────────────────────────────────────────────────

    socket.on('send_group_message', async ({ groupId, text, image, clientId }) => {
      console.log(`📨 Group msg from ${userId} to group ${groupId} clientId=${clientId}`);
      try {
        const group = await Group.findById(groupId);

        // BUG FIX: was group.members.includes(userId) which does reference equality
        // and always returns false because members are ObjectIds, not strings.
        if (!group || !isMember(group.members, userId)) {
          console.log(`🚫 User ${userId} is not a member of group ${groupId}`);
          return socket.emit('message_error', {
            clientId,
            error: 'Not a member of this group',
          });
        }

        const newMessage = await GroupMessage.create({
          group: groupId,
          sender: userId,
          text: text || '',
          image: image || null,
        });

        const populatedMessage = await GroupMessage.findById(newMessage._id)
          .populate('sender', 'name avatar')
          .exec();

        // BUG FIX: serialize so all ObjectIds are strings — prevents client
        // keyExtractor crash and string comparisons (message.group === groupId)
        const serialized = serialize(populatedMessage);

        const groupConvUpdate = {
          _id: groupId,
          name: group.name,
          avatar: group.avatar,
          lastMessage: image ? '📷 Image' : text,
          lastMessageTime: newMessage.createdAt,
          isGroup: true,
        };

        // Broadcast to all online group members
        for (const memberId of group.members) {
          const memberSockets = userSockets.get(memberId.toString());
          if (memberSockets) {
            for (const socketId of memberSockets) {
              io.to(socketId).emit('receive_group_message', serialized);
              io.to(socketId).emit('group_conversation_update', groupConvUpdate);
            }
          }
        }

        // Acknowledge the sender with the confirmed (server-saved) message
        // so the optimistic message can be replaced by the real one
        socket.emit('message_sent', { ...serialized, clientId });
      } catch (error) {
        console.error('Group message error:', error.message);
        socket.emit('message_error', { clientId, error: error.message });
      }
    });

    socket.on('typing_group', async ({ groupId, isTyping }) => {
      try {
        const group = await Group.findById(groupId);
        if (!group) return;

        for (const memberId of group.members) {
          if (memberId.toString() !== userId) {
            const memberSockets = userSockets.get(memberId.toString());
            if (memberSockets) {
              for (const socketId of memberSockets) {
                io.to(socketId).emit('user_typing_group', { groupId, userId, isTyping });
              }
            }
          }
        }
      } catch (error) {
        console.error('Group typing error:', error.message);
      }
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      const userSocketsSet = userSockets.get(userId);
      if (userSocketsSet) {
        userSocketsSet.delete(socket.id);
        if (userSocketsSet.size === 0) {
          userSockets.delete(userId);
        }
      }
      console.log(
        `❌ User ${userId} disconnected. Remaining: ${userSockets.get(userId)?.size || 0}`
      );
    });
  });
};