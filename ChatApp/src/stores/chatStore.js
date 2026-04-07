// stores/chatStore.js
import { create } from "zustand";
import { api } from "../api/api";
import { useAuthStore } from "./authStore";

export const useChatStore = create((set, get) => ({
  users: [],
  messages: [],
  conversations: [],
  activeChatPartnerId: null,
  isLoadingUsers: false,
  isLoadingMessages: false,

  // Fetch all conversations (inbox)
  fetchConversations: async () => {
    try {
      const res = await api.get('/chat/conversations');
      set({ conversations: res.data.data });
    } catch (error) {
      console.error("Inbox fetch failed", error);
    }
  },

  // Fetch message history with a specific user
  fetchMessages: async (partnerId) => {
    set({ isLoadingMessages: true, messages: [] });
    try {
      const response = await api.get(`/chat/history/${partnerId}`);
      set({ messages: response.data.data });
    } catch (error) {
      console.error("Failed to fetch messages", error);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  // Add a new message (called from socket or after sending)
  addMessage: (message) => {
    const { messages, activeChatPartnerId, conversations } = get();
    const currentUserId = useAuthStore.getState().user?.id;

    // Normalize sender/receiver IDs (could be object or string)
    const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
    const receiverId = typeof message.receiver === 'object' ? message.receiver._id : message.receiver;

    // 1. Update messages array if this message belongs to the open chat
    if (senderId === activeChatPartnerId || receiverId === activeChatPartnerId) {
      const isDuplicate = messages.some(m => m._id === message._id);
      if (!isDuplicate) {
        set({ messages: [...messages, message] });
      }
    }

    // 2. Update conversations list (move to top, update last message)
    const isReceived = senderId !== currentUserId;
    const partnerId = isReceived ? senderId : receiverId;
    const partnerDetails = isReceived ? message.sender : message.receiver;

    let updatedConversations = [...conversations];
    const existingIndex = updatedConversations.findIndex(c => c._id === partnerId);

    const newConversationEntry = {
      _id: partnerId,
      userDetails: partnerDetails || { _id: partnerId, name: "User" },
      lastMessage: message.text,
      lastMessageTime: message.createdAt,
    };

    if (existingIndex !== -1) {
      // Update existing conversation
      updatedConversations[existingIndex] = {
        ...updatedConversations[existingIndex],
        lastMessage: message.text,
        lastMessageTime: message.createdAt,
      };
      // Move to top
      const [moved] = updatedConversations.splice(existingIndex, 1);
      updatedConversations.unshift(moved);
    } else {
      // New conversation
      updatedConversations.unshift(newConversationEntry);
    }

    set({ conversations: updatedConversations });
  },

  // Update a single conversation (used by conversation_update event)
  updateConversation: (conversation) => {
    const { conversations } = get();
    const existingIndex = conversations.findIndex(c => c._id === conversation._id);
    let updated = [...conversations];
    if (existingIndex !== -1) {
      updated[existingIndex] = { ...updated[existingIndex], ...conversation };
      // Move to top
      const [moved] = updated.splice(existingIndex, 1);
      updated.unshift(moved);
    } else {
      updated.unshift(conversation);
    }
    set({ conversations: updated });
  },

  // Confirm an optimistic message (replace clientId with real _id)
  confirmMessage: (confirmedMessage) => {
    const { messages } = get();
    const updatedMessages = messages.map(msg =>
      msg.clientId === confirmedMessage.clientId ? confirmedMessage : msg
    );
    set({ messages: updatedMessages });
  },

  setActiveChat: (partnerId) => {
    set({ activeChatPartnerId: partnerId });
    if (partnerId) get().fetchMessages(partnerId);
  },

  fetchUsers: async () => {
    set({ isLoadingUsers: true });
    try {
      const response = await api.get("/chat/users");
      set({ users: response.data.data });
    } finally {
      set({ isLoadingUsers: false });
    }
  },

  clearMessages: () => set({ messages: [], activeChatPartnerId: null }),
}));