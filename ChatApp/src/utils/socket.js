// utils/socket.js
import io from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

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

  const BACKEND_URL = 'http://192.168.0.108:5001'; // Replace with your actual backend URL

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

export const sendMessage = (receiverId, text, clientId = null) => {
  if (!socket) {
    console.warn('⚠️ Socket not initialized');
    return false;
  }
  socket.emit('send_message', { receiverId, text, clientId });
  return true;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected');
  }
};