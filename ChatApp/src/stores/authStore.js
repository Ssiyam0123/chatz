import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { api } from "../api/api";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isHydrated: false,

      setHasHydrated: (state) => {
        set({ isHydrated: state });
      },

      login: async (email, password) => {
        try {
          const response = await api.post("/auth/login", { email, password });
          const payload = response.data.data; // payload contains { token, userId, name... }
          set({ 
            token: payload.token, 
            user: { 
              id: payload.userId || payload.id, 
              name: payload.name, 
              email: payload.email || email, 
              avatar: payload.avatar, 
              publicKey: payload.publicKey 
            } 
          });
        } catch (error) {
          console.error("Login Error:", error.response?.data || error.message);
          throw error;
        }
      },

      register: async (name, email, password) => {
        try {
          const response = await api.post("/auth/register", {
            name,
            email,
            password,
          });
          const payload = response.data.data;
          const registeredUser = payload.user || payload;
          set({
            token: payload.token,
            user: {
              id: registeredUser.id || registeredUser.userId,
              name: registeredUser.name,
              email: registeredUser.email,
              avatar: registeredUser.avatar,
              publicKey: registeredUser.publicKey,
            },
          });
        } catch (error) {
          console.error("Register Error:", error.response?.data || error.message);
          throw error;
        }
      },

      logout: async () => {
        set({ token: null, user: null });
      },

      updateUser: (updatedUser) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : updatedUser
        }));
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => 
        Platform.OS === 'web' ? window.localStorage : AsyncStorage
      ),
      onRehydrateStorage: () => (state) => {
        state.setHasHydrated(true);
      },
    },
  ),
);
