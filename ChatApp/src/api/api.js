// src/api/api.js
import axios from 'axios';
import { Platform } from 'react-native';
import { API_URL } from '../constants';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
});

api.interceptors.request.use(
  async (config) => {
    const { useAuthStore } = await import('../stores/authStore');
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Chat ────────────────────────────────────────────────────────────────────
export const getAllUsers = () => api.get('/chat/users');
export const getConversations = () => api.get('/chat/conversations');
export const getChatHistory = (partnerId) => api.get(`/chat/history/${partnerId}`);

// ─── Groups ──────────────────────────────────────────────────────────────────
export const getMyGroups = () => api.get('/groups/my-groups');
export const getGroupById = (groupId) => api.get(`/groups/${groupId}`);
export const createGroup = (name, memberIds, avatar) =>
  api.post('/groups/create', { name, memberIds, avatar });
export const getGroupMessages = (groupId) => api.get(`/groups/${groupId}/messages`);
export const addGroupMembers = (groupId, memberIds) =>
  api.post('/groups/add-members', { groupId, memberIds });

// ─── Upload ──────────────────────────────────────────────────────────────────
export const uploadImage = async (file) => {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    formData.append('image', blob, file.fileName || 'photo.jpg');
  } else {
    formData.append('image', {
      uri: file.uri,
      type: file.mimeType || 'image/jpeg',
      name: file.fileName || 'photo.jpg',
    });
  }

  try {
    const response = await api.post('/upload/image', formData, {
      headers: { Accept: 'application/json' },
    });
    return response.data.data.url;
  } catch (error) {
    console.error('Upload failed:', error.response?.data || error.message);
    throw error;
  }
};

export default api;