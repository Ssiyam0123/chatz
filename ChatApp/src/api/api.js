import axios from 'axios';
import { API_URL } from '../constants';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
});

api.interceptors.request.use(async (config) => {
  const { useAuthStore } = await import('../stores/authStore'); 
  const token = useAuthStore.getState().token;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));