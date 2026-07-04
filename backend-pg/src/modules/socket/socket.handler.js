import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from '../../config/pgDatabase.js';

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
    const userId = String(socket.user.id);

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
        if (!isEncrypted || !ciphertext || !nonce) {
          return socket.emit('message_error', {
            message: 'Security Guard: E2EE is mandatory. Plaintext messages are rejected.',
            clientId,
          });
        }

        // Friend request system guard - check UserFriend link table
        const { rowCount: isFriend } = await pool.query(
          `SELECT 1 FROM user_friends 
           WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
          [userId, receiverId]
        );

        if (isFriend === 0) {
          return socket.emit('message_error', {
            message: 'You can only send messages to users who are in your friends list.',
            clientId,
          });
        }

        const { rows: messages } = await pool.query(
          `INSERT INTO messages (sender_id, receiver_id, text, image, ciphertext, nonce, is_encrypted, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
           RETURNING id, created_at as "createdAt"`,
          [userId, receiverId, '🔒 [Encrypted Message]', null, ciphertext, nonce, true]
        );

        const newMessageId = messages[0].id;
        const newMessageCreatedAt = messages[0].createdAt;

        const { rows: populatedMessages } = await pool.query(
          `SELECT 
            m.id, m.text, m.image, m.ciphertext, m.nonce, m.is_encrypted as "isEncrypted", m.created_at as "createdAt", m.updated_at as "updatedAt",
            m.sender_id as "senderId", m.receiver_id as "receiverId",
            json_build_object('id', s.id, 'name', s.name, 'avatar', s.avatar, 'publicKey', s.public_key) as sender,
            json_build_object('id', r.id, 'name', r.name, 'avatar', r.avatar, 'publicKey', r.public_key) as receiver
           FROM messages m
           JOIN users s ON m.sender_id = s.id
           JOIN users r ON m.receiver_id = r.id
           WHERE m.id = $1`,
          [newMessageId]
        );

        const populatedMessage = populatedMessages[0];

        const { rows: senderRows } = await pool.query('SELECT id, name, avatar FROM users WHERE id = $1', [userId]);
        const { rows: receiverRows } = await pool.query('SELECT id, name, avatar FROM users WHERE id = $1', [receiverId]);

        const senderUserDetails = senderRows[0];
        const receiverUserDetails = receiverRows[0];

        const serialized = serialize(populatedMessage);

        const conversationForReceiver = {
          _id: userId,
          lastMessage: '🔒 Encrypted Message',
          lastMessageTime: newMessageCreatedAt,
          lastMessageImage: null,
          lastMessageCiphertext: ciphertext,
          lastMessageNonce: nonce,
          lastMessageIsEncrypted: true,
          userDetails: {
            _id: userId,
            name: senderUserDetails.name,
            avatar: senderUserDetails.avatar,
          },
        };

        const conversationForSender = {
          _id: receiverId,
          lastMessage: '🔒 Encrypted Message',
          lastMessageTime: newMessageCreatedAt,
          lastMessageImage: null,
          lastMessageCiphertext: ciphertext,
          lastMessageNonce: nonce,
          lastMessageIsEncrypted: true,
          userDetails: {
            _id: receiverId,
            name: receiverUserDetails?.name,
            avatar: receiverUserDetails?.avatar,
          },
        };

        const receiverSockets = userSockets.get(String(receiverId));
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
      const receiverSockets = userSockets.get(String(receiverId));
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
        const { rowCount: membership } = await pool.query(
          'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
          [groupId, userId]
        );

        if (membership === 0) {
          console.log(`🚫 User ${userId} is not a member of group ${groupId}`);
          return socket.emit('message_error', {
            clientId,
            error: 'Not a member of this group',
          });
        }

        const { rows: messages } = await pool.query(
          `INSERT INTO group_messages (group_id, sender_id, text, image, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, created_at as "createdAt"`,
          [groupId, userId, text || '', image || null]
        );

        const newMessageId = messages[0].id;
        const newMessageCreatedAt = messages[0].createdAt;

        const { rows: populatedMessages } = await pool.query(
          `SELECT 
            gm.id, gm.text, gm.image, gm.created_at as "createdAt", gm.updated_at as "updatedAt",
            gm.group_id as "groupId", gm.sender_id as "senderId",
            json_build_object('id', s.id, 'name', s.name, 'avatar', s.avatar) as sender
           FROM group_messages gm
           JOIN users s ON gm.sender_id = s.id
           WHERE gm.id = $1`,
          [newMessageId]
        );

        const populatedMessage = populatedMessages[0];
        // Ensure group field is populated so client knows it belongs to a group
        populatedMessage.group = groupId;
        const serialized = serialize(populatedMessage);

        const { rows: groups } = await pool.query('SELECT name, avatar FROM groups WHERE id = $1', [groupId]);
        const group = groups[0];

        const { rows: groupMembers } = await pool.query('SELECT user_id as "id" FROM group_members WHERE group_id = $1', [groupId]);

        const groupConvUpdate = {
          _id: groupId,
          name: group.name,
          avatar: group.avatar,
          lastMessage: image ? '📷 Image' : text,
          lastMessageTime: newMessageCreatedAt,
          isGroup: true,
        };

        // Broadcast to all online group members except the sender
        for (const member of groupMembers) {
          if (String(member.id) === userId) continue; // Skip sender
          const memberSockets = userSockets.get(String(member.id));
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
        const { rows: groupMembers } = await pool.query('SELECT user_id as "id" FROM group_members WHERE group_id = $1', [groupId]);
        
        for (const member of groupMembers) {
          if (String(member.id) !== userId) {
            const memberSockets = userSockets.get(String(member.id));
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

  return io;
};

export { userSockets };
