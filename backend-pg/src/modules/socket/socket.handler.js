import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Message, GroupMessage, User, Group, GroupMember } from '../../models/index.js';

const userSockets = new Map();

// Safely serialize to plain object
const serialize = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === 'object') {
    if (obj.toJSON) return serialize(obj.toJSON());
    const out = {};
    for (const k of Object.keys(obj)) {
      out[k] = serialize(obj[k]);
    }
    return out;
  }
  return obj;
};

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
        const senderUser = await User.findByPk(userId, {
          include: [{ association: 'friends', attributes: ['id'] }],
        });
        const isFriend = senderUser.friends?.some((f) => f.id === receiverId);
        if (!senderUser || !isFriend) {
          return socket.emit('message_error', {
            message: 'You can only send messages to users who are in your friends list.',
            clientId,
          });
        }

        const newMessage = await Message.create({
          senderId: userId,
          receiverId,
          text: text || '',
          image: image || null,
          ciphertext: ciphertext || null,
          nonce: nonce || null,
          isEncrypted: !!isEncrypted,
        });

        const populatedMessage = await Message.findByPk(newMessage.id, {
          include: [
            { association: 'sender', attributes: ['id', 'name', 'avatar', 'publicKey'] },
            { association: 'receiver', attributes: ['id', 'name', 'avatar', 'publicKey'] },
          ],
        });

        const senderUserDetails = await User.findByPk(userId, { attributes: ['id', 'name', 'avatar'] });
        const receiverUserDetails = await User.findByPk(receiverId, { attributes: ['id', 'name', 'avatar'] });

        const serialized = serialize(populatedMessage);

        const conversationForReceiver = {
          _id: userId,
          lastMessage: isEncrypted ? '🔒 Encrypted Message' : image ? '📷 Image' : text,
          lastMessageTime: newMessage.createdAt,
          lastMessageImage: image || null,
          lastMessageCiphertext: ciphertext || null,
          lastMessageNonce: nonce || null,
          lastMessageIsEncrypted: !!isEncrypted,
          userDetails: {
            _id: userId,
            name: senderUserDetails.name,
            avatar: senderUserDetails.avatar,
          },
        };

        const conversationForSender = {
          _id: receiverId,
          lastMessage: isEncrypted ? '🔒 Encrypted Message' : image ? '📷 Image' : text,
          lastMessageTime: newMessage.createdAt,
          lastMessageImage: image || null,
          lastMessageCiphertext: ciphertext || null,
          lastMessageNonce: nonce || null,
          lastMessageIsEncrypted: !!isEncrypted,
          userDetails: {
            _id: receiverId,
            name: receiverUserDetails?.name,
            avatar: receiverUserDetails?.avatar,
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
        // Check membership
        const membership = await GroupMember.findOne({
          where: { groupId, userId },
        });

        if (!membership) {
          console.log(`🚫 User ${userId} is not a member of group ${groupId}`);
          return socket.emit('message_error', {
            clientId,
            error: 'Not a member of this group',
          });
        }

        const newMessage = await GroupMessage.create({
          groupId,
          senderId: userId,
          text: text || '',
          image: image || null,
        });

        const populatedMessage = await GroupMessage.findByPk(newMessage.id, {
          include: [{ association: 'sender', attributes: ['id', 'name', 'avatar'] }],
        });

        const serialized = serialize(populatedMessage);

        const group = await Group.findByPk(groupId, {
          include: [{ association: 'members', attributes: ['id'] }],
        });

        const groupConvUpdate = {
          _id: groupId,
          name: group.name,
          avatar: group.avatar,
          lastMessage: image ? '📷 Image' : text,
          lastMessageTime: newMessage.createdAt,
          isGroup: true,
        };

        // Broadcast to all online group members
        for (const member of group.members) {
          const memberSockets = userSockets.get(member.id);
          if (memberSockets) {
            for (const socketId of memberSockets) {
              io.to(socketId).emit('receive_group_message', serialized);
              io.to(socketId).emit('group_conversation_update', groupConvUpdate);
            }
          }
        }

        socket.emit('message_sent', { ...serialized, clientId });
      } catch (error) {
        console.error('Group message error:', error.message);
        socket.emit('message_error', { clientId, error: error.message });
      }
    });

    socket.on('typing_group', async ({ groupId, isTyping }) => {
      try {
        const group = await Group.findByPk(groupId, {
          include: [{ association: 'members', attributes: ['id'] }],
        });
        if (!group) return;

        for (const member of group.members) {
          if (member.id !== userId) {
            const memberSockets = userSockets.get(member.id);
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

export { userSockets };
