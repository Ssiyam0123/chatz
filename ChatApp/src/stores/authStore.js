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
          const { token, data } = response.data;
          set({ token, user: { id: data.userId, name: data.name, email } });
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
          const { token, data } = response.data;
          set({
            token,
            user: {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
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
        set({ user: updatedUser });
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
