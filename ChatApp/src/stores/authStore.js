import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { api } from "../api/api";
import useChatStore from "./chatStore";

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
              publicKey: payload.publicKey,
            },
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
              id: registeredUser.id || registeredUser.userId || registeredUser._id,
              name: registeredUser.name,
              email: registeredUser.email,
              avatar: registeredUser.avatar,
              publicKey: registeredUser.publicKey || registeredUser.public_key,
            },
          });
        } catch (error) {
          console.error(
            "Register Error:",
            error.response?.data || error.message,
          );
          throw error;
        }
      },

      logout: async () => {
        set({ token: null, user: null });
      },

      updateUser: (updatedUser) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : updatedUser,
        }));

        try {
          const chatStore = useChatStore.getState();
          const userId =
            updatedUser.id ||
            updatedUser._id ||
            useAuthStore.getState().user?.id;

          if (userId) {
            const updatedFields = {};

            if (chatStore.posts) {
              updatedFields.posts = chatStore.posts.map((p) => {
                const postUserId = p.user?.id || p.user?._id || p.userId;
                if (postUserId === userId) {
                  return {
                    ...p,
                    user: {
                      ...p.user,
                      avatar:
                        updatedUser.avatar !== undefined
                          ? updatedUser.avatar
                          : p.user.avatar,
                      name:
                        updatedUser.name !== undefined
                          ? updatedUser.name
                          : p.user.name,
                    },
                  };
                }
                return p;
              });
            }

            if (chatStore.userPosts) {
              updatedFields.userPosts = chatStore.userPosts.map((p) => {
                const postUserId = p.user?.id || p.user?._id || p.userId;
                if (postUserId === userId) {
                  return {
                    ...p,
                    user: {
                      ...p.user,
                      avatar:
                        updatedUser.avatar !== undefined
                          ? updatedUser.avatar
                          : p.user.avatar,
                      name:
                        updatedUser.name !== undefined
                          ? updatedUser.name
                          : p.user.name,
                    },
                  };
                }
                return p;
              });
            }

            if (Object.keys(updatedFields).length > 0) {
              useChatStore.setState(updatedFields);
            }
          }
        } catch (e) {
          console.error("Error updating posts cache in authStore:", e);
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() =>
        Platform.OS === "web" ? window.localStorage : AsyncStorage,
      ),
      onRehydrateStorage: () => (state) => {
        state.setHasHydrated(true);
      },
    },
  ),
);
