import io from 'socket.io-client';
import { API_URL } from '../constants';
import { useChatStore } from '../stores/chatStore';

let socket = null;

export const initSocket = (token) => {
  if (socket?.connected) return;

  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
  });

  socket.on('receive_message', (message) => {
    const { activeChatPartnerId, addMessage } = useChatStore.getState();
    if (activeChatPartnerId === message.sender) {
      addMessage(message);
    }
  });

  socket.on('message_sent', (message) => {
    const { activeChatPartnerId, addMessage } = useChatStore.getState();
    if (activeChatPartnerId === message.receiver) {
      addMessage(message);
    }
  });

  socket.on('connect', () => console.log('✅ Socket Connected'));
  socket.on('connect_error', (err) => console.log("❌ Socket Error:", err.message));
};

export const sendMessage = (receiverId, text) => {
  if (socket?.connected) {
    socket.emit('send_message', { receiverId, text });
  } else {
    console.warn("⚠️ Socket not connected, message not sent");
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};