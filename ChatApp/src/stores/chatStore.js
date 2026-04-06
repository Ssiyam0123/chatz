import { create } from "zustand";
import { api } from "../api/api";

export const useChatStore = create((set, get) => ({
  users: [],
  messages: [],
  conversations: [],
  activeChatPartnerId: null,
  isLoadingUsers: false,
  isLoadingMessages: false,

  fetchUsers: async () => {
    set({ isLoadingUsers: true });
    try {
      const response = await api.get("/chat/users");
      set({ users: response.data.data });
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      set({ isLoadingUsers: false });
    }
  },

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

  setActiveChat: (partnerId) => {
    set({ activeChatPartnerId: partnerId });
    if (partnerId) {
      get().fetchMessages(partnerId);
    }
  },

  fetchConversations: async () => {
    try {
      const res = await api.get('/chat/conversations');
      set({ conversations: res.data.data });
    } catch (error) {
      console.error("Inbox fetch failed", error);
    }
  },

  addMessage: (message) => {
    const { messages, activeChatPartnerId } = get();

    const isDuplicate = messages.some((m) => m._id === message._id);
    if (!isDuplicate) {
      set({ messages: [...messages, message] });
    }

    set((state) => {
      const partnerId = message.sender === state.activeChatPartnerId ? message.sender : message.receiver;
      
      const existingConvIndex = state.conversations.findIndex(c => c._id === partnerId);
      const updatedConversations = [...state.conversations];

      if (existingConvIndex !== -1) {
        const updatedConv = {
          ...updatedConversations[existingConvIndex],
          lastMessage: message.text,
          lastMessageTime: message.createdAt
        };
        updatedConversations.splice(existingConvIndex, 1);
        updatedConversations.unshift(updatedConv);
      } else {
        get().fetchConversations();
      }

      return { conversations: updatedConversations };
    });
  },

  clearMessages: () => set({ messages: [], activeChatPartnerId: null }),
}));