// src/stores/chatStore.js
import { create } from 'zustand';
import api, { uploadImage } from '../api/api';
import { io } from 'socket.io-client';
import { Alert, Platform } from 'react-native';
import { API_URL } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  generateE2EEKeyPair, 
  encryptMessage, 
  decryptMessage 
} from '../utils/crypto';

// Decryption helper
const decryptSingleMessage = (msg, currentUserId, ownPrivateKey) => {
  if (!msg || !msg.isEncrypted || !ownPrivateKey) return msg;
  try {
    const senderId = msg.sender?._id || msg.sender;
    const isMeSender = (senderId === currentUserId || senderId?.toString() === currentUserId);
    const partner = isMeSender ? msg.receiver : msg.sender;
    const partnerPublicKey = partner?.publicKey || (typeof partner === 'object' ? partner.publicKey : null);
    
    if (!partnerPublicKey) {
      console.log('Skipping decryption: Partner public key missing from message object');
      return { ...msg, text: msg.text || '🔒 [Encrypted Message - Partner Public Key missing]' };
    }
    
    const decryptedText = decryptMessage(
      msg.ciphertext,
      msg.nonce,
      partnerPublicKey,
      ownPrivateKey
    );
    
    try {
      const parsed = JSON.parse(decryptedText);
      if (parsed && typeof parsed === 'object') {
        return {
          ...msg,
          text: parsed.text || '',
          image: parsed.image || msg.image || null,
        };
      }
    } catch (e) {
      return { ...msg, text: decryptedText };
    }
  } catch (err) {
    console.error('Decryption failed for message ID:', msg._id, err);
    return { ...msg, text: '🔒 [Decryption failed]' };
  }
};

const useChatStore = create((set, get) => ({
  // ========== State ==========
  token: null,
  user: null,
  
  // E2EE Cryptography State
  e2eePrivateKey: null,
  e2eePublicKey: null,
  
  // Private chats
  conversations: [],      
  privateMessagesCache: {}, // { [partnerId]: array of messages }
  activeChatPartnerId: null,
  
  // Groups
  groups: [],              
  groupMessagesCache: {},  
  activeGroupId: null,
  
  // Users
  users: [],
  isLoadingUsers: false,
  friendRequests: [],
  friends: [],
  suggestions: [],
  isLoadingSuggestions: false,
  
  // Posts & Stories
  posts: [],
  userPosts: [],
  stories: [],
  isLoadingPosts: false,
  isLoadingUserPosts: false,
  isLoadingStories: false,
  hasMorePosts: true,
  hasMoreUserPosts: true,

  // Indicators
  uploadingImage: false,
  typingUsers: {}, // { [identifier]: { [userId]: name } }
  isLoading: false,
  
  _socket: null,
  
  // ========== Actions ==========
  
  initE2EE: async (userData) => {
    try {
      const userId = userData.id || userData._id;
      const storedKeysStr = await AsyncStorage.getItem(`@chat_z_keys_${userId}`);
      let keys;
      
      if (storedKeysStr) {
        keys = JSON.parse(storedKeysStr);
      } else {
        console.log('Generating new E2EE keypair...');
        keys = generateE2EEKeyPair();
        await AsyncStorage.setItem(`@chat_z_keys_${userId}`, JSON.stringify(keys));
      }

      set({ e2eePrivateKey: keys.secretKey, e2eePublicKey: keys.publicKey });

      // If user public key doesn't match backend public key, update it
      if (!userData.publicKey || userData.publicKey !== keys.publicKey) {
        console.log('Registering E2EE Public Key on backend...');
        await api.put('/user/public-key', { publicKey: keys.publicKey });
        
        const updatedUser = { ...userData, publicKey: keys.publicKey };
        set({ user: updatedUser });
        
        // Sync user update with authStore
        const { useAuthStore } = await import('./authStore');
        useAuthStore.getState().updateUser(updatedUser);
      }
    } catch (err) {
      console.error('❌ E2EE Initialization Error:', err);
    }
  },

  init: async (token, userData) => {
    if (get()._socket) return;

    set({ token, user: userData });
    
    // Initialize E2EE first
    await get().initE2EE(userData);
    
    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    
    socket.on('connect', () => console.log('✅ Socket connected'));
    
    socket.on('receive_message', (message) => {
      const { user, addPrivateMessage, updateConversation, e2eePrivateKey } = get();
      const currentUserId = user?.id || user?._id;
      
      // Decrypt message if encrypted
      const decrypted = decryptSingleMessage(message, currentUserId, e2eePrivateKey);
      const partnerId = decrypted.sender._id === currentUserId ? decrypted.receiver : decrypted.sender._id;
      
      addPrivateMessage(partnerId, decrypted);
      updateConversation({
        _id: partnerId,
        lastMessage: decrypted.image ? '📷 Image' : decrypted.text,
        lastMessageTime: decrypted.createdAt,
      });
    });

    socket.on('message_error', ({ message, clientId }) => {
      Alert.alert('Chat Security Guard', message);
      set((state) => {
        const nextCache = { ...state.privateMessagesCache };
        for (const partnerId in nextCache) {
          nextCache[partnerId] = (nextCache[partnerId] || []).filter(m => m.clientId !== clientId);
        }
        return { privateMessagesCache: nextCache };
      });
    });

    socket.on('receive_group_message', (message) => {
      get().addGroupMessage(message.group, message);
    });

    socket.on('message_sent', (confirmedMessage) => {
      if (confirmedMessage.group) {
        // Handle group confirmation
        set((state) => {
          const groupId = confirmedMessage.group;
          const cache = state.groupMessagesCache[groupId] || [];
          return {
            groupMessagesCache: {
              ...state.groupMessagesCache,
              [groupId]: cache.map(m => m.clientId === confirmedMessage.clientId ? confirmedMessage : m)
            }
          };
        });
      } else {
        // Handle private confirmation
        const partnerId = confirmedMessage.receiver;
        const { user, e2eePrivateKey } = get();
        const currentUserId = user?.id || user?._id;
        
        // Decrypt the server-returned confirmed message
        const decrypted = decryptSingleMessage(confirmedMessage, currentUserId, e2eePrivateKey);

        set((state) => {
          const cache = state.privateMessagesCache[partnerId] || [];
          return {
            privateMessagesCache: {
              ...state.privateMessagesCache,
              [partnerId]: cache.map(m => m.clientId === confirmedMessage.clientId ? decrypted : m)
            }
          };
        });
      }
    });

    socket.on('conversation_update', (conv) => {
      get().updateConversation(conv);
    });

    socket.on('group_conversation_update', (groupConv) => {
      get().updateConversation({
        _id: groupConv._id,
        name: groupConv.name,
        avatar: groupConv.avatar,
        lastMessage: groupConv.lastMessage,
        lastMessageTime: groupConv.lastMessageTime,
        isGroup: true
      });
    });

    socket.on('user_typing', ({ userId, isTyping }) => {
      // Logic for private typing if needed
    });

    socket.on('user_typing_group', ({ groupId, userId, isTyping, senderName }) => {
      set((state) => {
        const groupTyping = { ...(state.typingUsers[groupId] || {}) };
        if (isTyping) {
          groupTyping[userId] = senderName || 'Someone';
        } else {
          delete groupTyping[userId];
        }
        return {
          typingUsers: { ...state.typingUsers, [groupId]: groupTyping }
        };
      });
    });

    socket.on('new_post', (post) => {
      set((state) => {
        const exists = state.posts.some(p => p._id === post._id);
        if (exists) return {};
        const currentUserId = state.user?.id || state.user?._id;
        const postUserId = post.user?._id || post.user;
        const isMyPost = postUserId && currentUserId && (postUserId.toString() === currentUserId.toString());
        return {
          posts: [post, ...state.posts],
          userPosts: isMyPost ? [post, ...(state.userPosts || [])] : state.userPosts
        };
      });
    });

    socket.on('update_post', (updatedPost) => {
      set((state) => ({
        posts: state.posts.map(p => p._id === updatedPost._id ? updatedPost : p),
        userPosts: (state.userPosts || []).map(p => p._id === updatedPost._id ? updatedPost : p)
      }));
    });

    socket.on('delete_post', (postId) => {
      set((state) => ({
        posts: state.posts.filter(p => p._id !== postId),
        userPosts: (state.userPosts || []).filter(p => p._id !== postId)
      }));
    });

    socket.on('new_story', () => {
      get().fetchStories();
    });
    
    set({ _socket: socket });
    
    get().fetchConversations();
    get().fetchGroups();
    get().fetchFriendRequests();
    get().fetchFriends();
    get().fetchPosts();
    get().fetchStories();
  },
  
  // ===== Users Actions =====
  fetchUsers: async () => {
    set({ isLoadingUsers: true });
    try {
      const res = await api.get('/chat/users');
      set({ users: res.data.data });
    } catch (err) { console.error(err); }
    finally { set({ isLoadingUsers: false }); }
  },

  // ===== Generic Conversation Logic =====
  updateConversation: (conv) => {
    const { e2eePrivateKey, users } = get();
    let updatedConv = { ...conv };

    if (conv.lastMessageIsEncrypted && e2eePrivateKey) {
      try {
        const partnerPublicKey = conv.userDetails?.publicKey || users.find(u => u._id === conv._id)?.publicKey;
        if (partnerPublicKey) {
          const decryptedText = decryptMessage(
            conv.lastMessageCiphertext,
            conv.lastMessageNonce,
            partnerPublicKey,
            e2eePrivateKey
          );
          try {
            const parsed = JSON.parse(decryptedText);
            updatedConv.lastMessage = parsed.image ? '📷 Image' : (parsed.text || '');
          } catch (e) {
            updatedConv.lastMessage = decryptedText;
          }
        }
      } catch (err) {
        console.error('Failed to decrypt conversation update:', err);
      }
    }

    set((state) => {
      const existingIdx = state.conversations.findIndex(c => c._id === updatedConv._id);
      let updated = [...state.conversations];
      if (existingIdx !== -1) {
        updated[existingIdx] = { ...updated[existingIdx], ...updatedConv };
        const [item] = updated.splice(existingIdx, 1);
        updated.unshift(item);
      } else {
        updated.unshift(updatedConv);
      }
      return { conversations: updated };
    });
  },

  // ===== Private Chat Actions =====
  fetchConversations: async () => {
    try {
      const res = await api.get('/chat/conversations');
      const { user, e2eePrivateKey } = get();
      const currentUserId = user?.id || user?._id;

      const decryptedConversations = res.data.data.map(conv => {
        if (conv.lastMessageIsEncrypted && e2eePrivateKey) {
          try {
            const partnerPublicKey = conv.userDetails?.publicKey;
            if (partnerPublicKey) {
              const decryptedText = decryptMessage(
                conv.lastMessageCiphertext,
                conv.lastMessageNonce,
                partnerPublicKey,
                e2eePrivateKey
              );
              try {
                const parsed = JSON.parse(decryptedText);
                return {
                  ...conv,
                  lastMessage: parsed.image ? '📷 Image' : (parsed.text || '')
                };
              } catch (e) {
                return {
                  ...conv,
                  lastMessage: decryptedText
                };
              }
            }
          } catch (err) {
            console.error('Failed to decrypt conversation list item:', err);
          }
        }
        return conv;
      });

      set({ conversations: decryptedConversations });
    } catch (err) { console.error(err); }
  },
  
  fetchChatHistory: async (partnerId) => {
    try {
      const res = await api.get(`/chat/history/${partnerId}`);
      const { user, e2eePrivateKey } = get();
      const currentUserId = user?.id || user?._id;

      // Decrypt each message on the fly
      const decryptedMessages = res.data.data.map(m => 
        decryptSingleMessage(m, currentUserId, e2eePrivateKey)
      );

      set((state) => ({
        privateMessagesCache: { ...state.privateMessagesCache, [partnerId]: decryptedMessages }
      }));
    } catch (err) { console.error(err); }
  },
  
  sendMessage: async (receiverId, text, imageUrl = null) => {
    const { _socket, user, e2eePrivateKey, users } = get();
    if (!_socket) return;
    const clientId = Date.now().toString();
    const currentUserId = user.id || user._id;

    // Find recipient's public key
    let receiverPublicKey = null;
    const receiverUser = users.find(u => (u._id || u.id) === receiverId);
    if (receiverUser) {
      receiverPublicKey = receiverUser.publicKey;
    } else {
      try {
        const res = await api.get('/chat/users');
        const found = res.data.data.find(u => (u._id || u.id) === receiverId);
        if (found) receiverPublicKey = found.publicKey;
      } catch (err) {
        console.error('Could not fetch user public key:', err);
      }
    }

    let payload = { receiverId, clientId };
    let optimisticMsg = {
      _id: clientId,
      clientId,
      text,
      image: imageUrl,
      sender: { _id: currentUserId, name: user.name, avatar: user.avatar, publicKey: user.publicKey },
      receiver: receiverId,
      createdAt: new Date().toISOString(),
    };

    if (receiverPublicKey && e2eePrivateKey) {
      // Both users have E2EE keypairs, encrypt message text & image payload in a JSON box
      const encryptPayload = { text, image: imageUrl };
      try {
        const { ciphertext, nonce } = encryptMessage(
          JSON.stringify(encryptPayload), 
          receiverPublicKey, 
          e2eePrivateKey
        );
        payload.ciphertext = ciphertext;
        payload.nonce = nonce;
        payload.isEncrypted = true;

        optimisticMsg.ciphertext = ciphertext;
        optimisticMsg.nonce = nonce;
        optimisticMsg.isEncrypted = true;
      } catch (err) {
        console.error('Encryption failed, sending unencrypted fallback:', err);
        payload.text = text;
        payload.image = imageUrl;
        payload.isEncrypted = false;
      }
    } else {
      // Fallback for users without keypairs
      payload.text = text;
      payload.image = imageUrl;
      payload.isEncrypted = false;
    }

    get().addPrivateMessage(receiverId, optimisticMsg);
    _socket.emit('send_message', payload);
  },
  
  addPrivateMessage: (partnerId, message) => {
    set((state) => {
      const cache = state.privateMessagesCache[partnerId] || [];
      if (cache.some(m => m._id === message._id || (m.clientId && m.clientId === message.clientId))) return state;
      return {
        privateMessagesCache: { ...state.privateMessagesCache, [partnerId]: [...cache, message] }
      };
    });
  },
  
  // ===== Group Actions =====
  fetchGroups: async () => {
    try {
      const res = await api.get('/groups/my-groups');
      set({ groups: res.data.data });
    } catch (err) { console.error(err); }
  },
  
  fetchGroupMessages: async (groupId) => {
    try {
      const res = await api.get(`/groups/${groupId}/messages`);
      set((state) => ({
        groupMessagesCache: { ...state.groupMessagesCache, [groupId]: res.data.data }
      }));
    } catch (err) { console.error(err); }
  },
  
  sendGroupMessage: (groupId, text, imageUrl = null) => {
    const { _socket, user } = get();
    if (!_socket) return;
    const clientId = Date.now().toString();
    const optimisticMsg = {
      _id: clientId,
      clientId,
      text,
      image: imageUrl,
      sender: { _id: user.id || user._id, name: user.name, avatar: user.avatar },
      group: groupId,
      createdAt: new Date().toISOString(),
    };
    get().addGroupMessage(groupId, optimisticMsg);
    _socket.emit('send_group_message', { groupId, text, image: imageUrl, clientId });
  },
  
  addGroupMessage: (groupId, message) => {
    set((state) => {
      const cache = state.groupMessagesCache[groupId] || [];
      if (cache.some(m => m._id === message._id || (m.clientId && m.clientId === message.clientId))) return state;
      return {
        groupMessagesCache: { ...state.groupMessagesCache, [groupId]: [...cache, message] }
      };
    });
  },
  
  setTypingGroup: (groupId, isTyping) => {
    const { _socket } = get();
    if (_socket) _socket.emit('typing_group', { groupId, isTyping });
  },

  // ===== Image Upload & Send =====
  uploadAndSendImage: async (asset, chatType, identifier, text = '') => {
    const clientId = Date.now().toString();
    const { user, addPrivateMessage, addGroupMessage, e2eePrivateKey, users } = get();
    const currentUserId = user.id || user._id;
    
    // 1. Add Optimistic Message with local URI
    const optimisticMsg = {
      _id: clientId,
      clientId,
      text,
      image: asset.uri,
      sender: { _id: currentUserId, name: user.name, avatar: user.avatar, publicKey: user.publicKey },
      [chatType === 'private' ? 'receiver' : 'group']: identifier,
      createdAt: new Date().toISOString(),
      isUploading: true,
    };

    if (chatType === 'private') {
      addPrivateMessage(identifier, optimisticMsg);
    } else {
      addGroupMessage(identifier, optimisticMsg);
    }

    set({ uploadingImage: true });
    try {
      const url = await uploadImage(asset);
      
      // 2. Send via socket with the real Cloudinary URL
      const { _socket } = get();
      if (_socket) {
        if (chatType === 'private') {
          // Encrypt url if recipient has public key
          let receiverPublicKey = null;
          const receiverUser = users.find(u => (u._id || u.id) === identifier);
          if (receiverUser) {
            receiverPublicKey = receiverUser.publicKey;
          } else {
            try {
              const res = await api.get('/chat/users');
              const found = res.data.data.find(u => (u._id || u.id) === identifier);
              if (found) receiverPublicKey = found.publicKey;
            } catch (err) {
              console.error('Could not fetch user public key:', err);
            }
          }

          let payload = { receiverId: identifier, clientId };
          if (receiverPublicKey && e2eePrivateKey) {
            const encryptPayload = { text, image: url };
            const { ciphertext, nonce } = encryptMessage(
              JSON.stringify(encryptPayload),
              receiverPublicKey,
              e2eePrivateKey
            );
            payload.ciphertext = ciphertext;
            payload.nonce = nonce;
            payload.isEncrypted = true;
          } else {
            payload.text = text;
            payload.image = url;
            payload.isEncrypted = false;
          }
          _socket.emit('send_message', payload);
        } else {
          _socket.emit('send_group_message', { groupId: identifier, text, image: url, clientId });
        }
      }
    } catch (err) {
      console.error('Upload failed:', err);
      Alert.alert('Upload failed', err.message);
      // Remove failed message
      if (chatType === 'private') {
        set((state) => ({
          privateMessagesCache: {
            ...state.privateMessagesCache,
            [identifier]: (state.privateMessagesCache[identifier] || []).filter(m => m.clientId !== clientId)
          }
        }));
      } else {
        set((state) => ({
          groupMessagesCache: {
            ...state.groupMessagesCache,
            [identifier]: (state.groupMessagesCache[identifier] || []).filter(m => m.clientId !== clientId)
          }
        }));
      }
    } finally {
      set({ uploadingImage: false });
    }
  },
  
  // ===== Friend Request System Actions =====
  fetchFriendRequests: async () => {
    try {
      const res = await api.get('/friends/requests');
      set({ friendRequests: res.data.data });
    } catch (err) {
      console.error('Error fetching friend requests:', err);
    }
  },

  fetchFriends: async () => {
    try {
      const res = await api.get('/friends');
      set({ friends: res.data.data });
      
      // Keep user.friends synced
      const { user } = get();
      if (user) {
        const friendIds = res.data.data.map(f => f._id || f.id);
        const updatedUser = { ...user, friends: friendIds };
        set({ user: updatedUser });
        
        // Sync with authStore
        const { useAuthStore } = await import('./authStore');
        useAuthStore.getState().updateUser(updatedUser);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  },

  fetchSuggestions: async () => {
    set({ isLoadingSuggestions: true });
    try {
      const res = await api.get('/friends/suggestions');
      set({ suggestions: res.data.data });
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      set({ isLoadingSuggestions: false });
    }
  },

  sendFriendRequest: async (receiverId) => {
    try {
      await api.post('/friends/request', { receiverId });
      // Refresh requests and users lists
      get().fetchFriendRequests();
      get().fetchUsers();
    } catch (err) {
      console.error('Error sending friend request:', err.response?.data || err.message);
      Alert.alert('Friend Request Error', err.response?.data?.message || err.message);
    }
  },

  respondFriendRequest: async (requestId, status) => {
    try {
      await api.put(`/friends/request/${requestId}`, { status });
      // Refresh friend lists and users lists
      get().fetchFriendRequests();
      get().fetchFriends();
      get().fetchUsers();
    } catch (err) {
      console.error('Error responding to friend request:', err.response?.data || err.message);
      Alert.alert('Response Error', err.response?.data?.message || err.message);
    }
  },

  removeFriend: async (friendId) => {
    try {
      await api.delete(`/friends/${friendId}`);
      get().fetchFriends();
      get().fetchUsers();
    } catch (err) {
      console.error('Error removing friend:', err.response?.data || err.message);
      Alert.alert('Remove Friend Error', err.response?.data?.message || err.message);
    }
  },

  // ===== Posts & Stories Actions =====
  fetchPosts: async (page = 1, limit = 15) => {
    if (page === 1) {
      set({ isLoadingPosts: true, hasMorePosts: true });
    }
    try {
      const res = await api.get(`/posts?page=${page}&limit=${limit}`);
      const newPosts = res.data.data;
      set((state) => ({
        posts: page === 1 ? newPosts : [...state.posts, ...newPosts],
        hasMorePosts: newPosts.length === limit
      }));
      return newPosts;
    } catch (err) {
      console.error('Error fetching posts:', err);
      return [];
    } finally {
      if (page === 1) {
        set({ isLoadingPosts: false });
      }
    }
  },

  fetchUserPosts: async (userId, page = 1, limit = 15) => {
    if (page === 1) {
      set({ isLoadingUserPosts: true, hasMoreUserPosts: true });
    }
    try {
      const res = await api.get(`/posts/user/${userId}?page=${page}&limit=${limit}`);
      const newPosts = res.data.data;
      set((state) => ({
        userPosts: page === 1 ? newPosts : [...state.userPosts, ...newPosts],
        hasMoreUserPosts: newPosts.length === limit
      }));
      return newPosts;
    } catch (err) {
      console.error('Error fetching user posts:', err);
      return [];
    } finally {
      if (page === 1) {
        set({ isLoadingUserPosts: false });
      }
    }
  },

  deletePost: async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      set((state) => ({
        posts: state.posts.filter((p) => p._id !== postId),
        userPosts: (state.userPosts || []).filter((p) => p._id !== postId)
      }));
    } catch (err) {
      console.error('Error deleting post:', err);
      throw err;
    }
  },

  createPost: async (content, images = []) => {
    try {
      const postImages = Array.isArray(images) ? images : [images].filter(Boolean);
      const res = await api.post('/posts', { 
        content, 
        images: postImages,
        image: postImages[0] || ""
      });
      return res.data.data;
    } catch (err) {
      console.error('Error creating post:', err);
      throw err;
    }
  },

  editPost: async (postId, content, images = []) => {
    try {
      const postImages = Array.isArray(images) ? images : [images].filter(Boolean);
      const res = await api.put(`/posts/${postId}`, {
        content,
        images: postImages,
        image: postImages[0] || ""
      });
      const updatedPost = res.data.data;
      if (updatedPost) {
        set((state) => ({
          posts: state.posts.map(p => p._id === updatedPost._id ? updatedPost : p),
          userPosts: (state.userPosts || []).map(p => p._id === updatedPost._id ? updatedPost : p)
        }));
      }
      return updatedPost;
    } catch (err) {
      console.error('Error editing post:', err);
      throw err;
    }
  },

  toggleLikePost: async (postId, type = 'like') => {
    try {
      const res = await api.post(`/posts/${postId}/like`, { type });
      const updatedPost = res.data.data;
      if (updatedPost) {
        set((state) => ({
          posts: state.posts.map(p => p._id === updatedPost._id ? updatedPost : p),
          userPosts: (state.userPosts || []).map(p => p._id === updatedPost._id ? updatedPost : p)
        }));
      }
      return res.data;
    } catch (err) {
      console.error('Error liking/reacting to post:', err);
      throw err;
    }
  },

  addComment: async (postId, text) => {
    try {
      const res = await api.post(`/posts/${postId}/comment`, { text });
      const updatedPost = res.data.data;
      if (updatedPost) {
        set((state) => ({
          posts: state.posts.map(p => p._id === updatedPost._id ? updatedPost : p),
          userPosts: (state.userPosts || []).map(p => p._id === updatedPost._id ? updatedPost : p)
        }));
      }
      return updatedPost;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  },

  toggleReactionComment: async (postId, commentId, type = 'like') => {
    try {
      const res = await api.post(`/posts/${postId}/comment/${commentId}/react`, { type });
      const updatedPost = res.data.data;
      if (updatedPost) {
        set((state) => ({
          posts: state.posts.map(p => p._id === updatedPost._id ? updatedPost : p),
          userPosts: (state.userPosts || []).map(p => p._id === updatedPost._id ? updatedPost : p)
        }));
      }
      return res.data;
    } catch (err) {
      console.error('Error reacting to comment:', err);
      throw err;
    }
  },

  sharePost: async (postId, content) => {
    try {
      const res = await api.post(`/posts/${postId}/share`, { content });
      const newPost = res.data.data;
      if (newPost) {
        set((state) => {
          const currentUserId = state.user?.id || state.user?._id;
          const isOwnSharedPost = (newPost.user?._id || newPost.user) === currentUserId;
          return {
            posts: [newPost, ...state.posts],
            userPosts: isOwnSharedPost ? [newPost, ...(state.userPosts || [])] : (state.userPosts || [])
          };
        });
      }
      return newPost;
    } catch (err) {
      console.error('Error sharing post:', err);
      throw err;
    }
  },

  fetchStories: async () => {
    set({ isLoadingStories: true });
    try {
      const res = await api.get('/stories');
      set({ stories: res.data.data });
    } catch (err) {
      console.error('Error fetching stories:', err);
    } finally {
      set({ isLoadingStories: false });
    }
  },

  createStory: async (image, text) => {
    try {
      const res = await api.post('/stories', { image, text });
      return res.data.data;
    } catch (err) {
      console.error('Error creating story:', err);
      throw err;
    }
  },

  viewStory: async (storyId) => {
    try {
      const res = await api.post(`/stories/${storyId}/view`);
      // Update local stories cache seen state if needed
      set((state) => {
        const updatedStories = state.stories.map((grp) => {
          const updatedList = grp.stories.map((st) => {
            if (st._id === storyId) {
              const currentUserId = state.user?.id || state.user?._id;
              const hasViewed = st.viewers?.some(v => (v._id || v) === currentUserId);
              if (!hasViewed) {
                const viewers = [...(st.viewers || []), { _id: currentUserId, name: state.user?.name, avatar: state.user?.avatar }];
                return { ...st, viewers };
              }
            }
            return st;
          });
          return { ...grp, stories: updatedList };
        });
        return { stories: updatedStories };
      });
      return res.data;
    } catch (err) {
      console.error('Error recording story view:', err);
    }
  },
  
  disconnect: () => {
    const { _socket } = get();
    if (_socket) _socket.disconnect();
    set({ 
      _socket: null, 
      token: null, 
      user: null, 
      e2eePrivateKey: null,
      e2eePublicKey: null,
      conversations: [], 
      groups: [],
      friendRequests: [],
      friends: [],
      posts: [],
      userPosts: [],
      stories: []
    });
  },
}));

export default useChatStore;
