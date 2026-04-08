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

  fetchConversations: async () => {
    try {
      const res = await api.get("/chat/conversations");
      set({ conversations: res.data.data });
    } catch (error) {
      console.error("Inbox fetch failed", error);
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


  addMessage: (message) => {
    if (!message) return; 

    const { messages, activeChatPartnerId, conversations } = get();
    const user = useAuthStore.getState().user;

  
    const currentUserId = user?.id || user?._id;
    if (!currentUserId) {
      console.error("Auth user not found in store");
      return;
    }

    const senderId = message.sender?._id || message.sender;
    const receiverId = message.receiver?._id || message.receiver;

    if (
      senderId === activeChatPartnerId ||
      receiverId === activeChatPartnerId
    ) {
      const isDuplicate = messages.some((m) => m._id === message._id);
      if (!isDuplicate) {
        set({ messages: [...get().messages, message] });
      }
    }

    set((state) => {
      const isReceived = senderId !== currentUserId;

      const partnerId = isReceived ? senderId : receiverId;
      const partnerData = isReceived
        ? message.sender
        : { _id: receiverId, name: "Chat" };

      if (!partnerId) return state; 

      const existingIdx = state.conversations.findIndex(
        (c) => c._id === partnerId,
      );
      let updatedConv = [...state.conversations];

      if (existingIdx !== -1) {
        const updatedItem = {
          ...updatedConv[existingIdx],
          lastMessage: message.text,
          lastMessageTime: message.createdAt,
        };
        updatedConv.splice(existingIdx, 1);
        updatedConv.unshift(updatedItem);
      } else {
        updatedConv.unshift({
          _id: partnerId,
          userDetails: {
            _id: partnerId,
            name: partnerData?.name || "User",
            avatar: partnerData?.avatar || "",
          },
          lastMessage: message.text,
          lastMessageTime: message.createdAt,
        });
        get().fetchConversations();
      }

      return { conversations: updatedConv };
    });
  },

  updateConversation: (conversation) => {
    const { conversations } = get();
    const existingIndex = conversations.findIndex(
      (c) => c._id === conversation._id,
    );
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


  confirmMessage: (confirmedMessage) => {
    const { messages } = get();
    const updatedMessages = messages.map((msg) =>
      msg.clientId === confirmedMessage.clientId ? confirmedMessage : msg,
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
