import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
        const response = await api.post("/auth/login", { email, password });
        const { token, data } = response.data;
        set({ token, user: { id: data.userId, name: data.name, email } });
      },

      register: async (name, email, password) => {
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
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state.setHasHydrated(true);
      },
    },
  ),
);
