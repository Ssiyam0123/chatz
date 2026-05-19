// utils/socket.js
import io from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { API_URL } from '../constants';

let socket = null;

export const initSocket = (token) => {
  if (socket) {
    console.log('Socket already initialized');
    return socket;
  }

  if (!token) {
    console.warn('⚠️ No token, cannot init socket');
    return null;
  }

  const BACKEND_URL = API_URL

  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected');
  });

  // Incoming message
  socket.on('receive_message', (message) => {
    console.log('📨 New message received', message);
    useChatStore.getState().addMessage(message);
  });

  // Conversation list update (last message, time, avatar)
  socket.on('conversation_update', (conversation) => {
    console.log('🔄 Conversation update', conversation);
    useChatStore.getState().updateConversation(conversation);
  });

  socket.on('receive_group_message', (message) => {
    console.log('📨 New group message received', message);
    // You could extend chatStore to handle group messages globally
  });

  socket.on('group_conversation_update', (groupConv) => {
    console.log('🔄 Group conversation update', groupConv);
    // Map to the structure updateConversation expects if needed
    useChatStore.getState().updateConversation({
        _id: groupConv._id,
        lastMessage: groupConv.lastMessage,
        lastMessageTime: groupConv.lastMessageTime,
        userDetails: {
            _id: groupConv._id,
            name: groupConv.name,
            avatar: groupConv.avatar
        },
        isGroup: true
    });
  });

  // Message sent confirmation (for optimistic UI)
  socket.on('message_sent', (confirmedMessage) => {
    console.log('✅ Message confirmed', confirmedMessage);
    useChatStore.getState().confirmMessage(confirmedMessage);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const sendMessage = (receiverId, text, clientId = null, image = null) => {
  if (!socket) {
    console.warn('⚠️ Socket not initialized');
    return false;
  }
  socket.emit('send_message', { receiverId, text, image, clientId });
  return true;
};

export const sendGroupMessage = (groupId, text, clientId = null, image = null) => {
  if (!socket) {
    console.warn('⚠️ Socket not initialized');
    return false;
  }
  socket.emit('send_group_message', { groupId, text, image, clientId });
  return true;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected');
  }
};