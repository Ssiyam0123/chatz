import { axiosInstance } from "@/lib/axios.js";
import { create } from "zustand";

export const useAuth = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isLoggedIn: false,
  isRegistered: false,
  socket: null,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const { data } = await axiosInstance.get("/auth/check");
      console.log("checking auth", data);
      set({ authUser: data });
    } catch (error) {
      console.log("error in checking auth");
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  login: async ({ email, password }) => {
    try {
      const { data } = await axiosInstance.post("/auth/login", {
        email,
        password,
      });
      set({ authUser: data.user });
      console.log(data);
    } catch (error) {
      console.log(error);
    } finally {
      set({ isCheckingAuth: false });
    }
  },
  register: async ({ username, email, password }) => {
    try {
      const { data } = await axiosInstance.post("/auth/register", {
        username,
        email,
        password,
      });
      set({ authUser: data.user });
      //   console.log(data);
    } catch (error) {
      console.log(error);
    } finally {
      set({ isCheckingAuth: false });
    }
  },
  logout: async () => {
    try {
      const { data } = await axiosInstance.post("/auth/logout");
      console.log("logout data : ", data);
      set({ authUser: null });
    } catch (error) {
      console.log("Logout error:", error);
    }
  },
}));
