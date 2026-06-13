import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import useChatStore from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';

export default function PeopleScreen({ navigation }) {
  const { 
    users, 
    isLoadingUsers, 
    fetchUsers,
    friends,
    friendRequests,
    suggestions,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    fetchFriends,
    fetchFriendRequests,
    fetchSuggestions,
  } = useChatStore();

  const currentUserId = useAuthStore((state) => state.user?.id || state.user?._id);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'sent' | 'suggestions'
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
      fetchFriends();
      fetchFriendRequests();
      fetchSuggestions();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUsers(), 
      fetchFriends(), 
      fetchFriendRequests(),
      fetchSuggestions()
    ]);
    setRefreshing(false);
  };

  // Compute display list based on active tab and search query
  const displayData = useMemo(() => {
    let list = [];
    if (activeTab === 'friends') {
      list = friends.map(f => ({
        id: f.id || f._id,
        name: f.name,
        email: f.email,
        avatar: f.avatar,
        bio: f.bio,
        type: 'friend'
      }));
    } else if (activeTab === 'requests') {
      list = friendRequests
        .filter(r => (r.receiver?._id || r.receiver?.id || r.receiver) === currentUserId && r.status === 'pending')
        .map(r => ({
          id: r.sender?.id || r.sender?._id,
          name: r.sender?.name || 'User',
          email: r.sender?.email,
          avatar: r.sender?.avatar,
          bio: r.sender?.bio,
          requestId: r.id || r._id,
          type: 'incoming'
        }));
    } else if (activeTab === 'sent') {
      list = friendRequests
        .filter(r => (r.sender?._id || r.sender?.id || r.sender) === currentUserId && r.status === 'pending')
        .map(r => ({
          id: r.receiver?.id || r.receiver?._id,
          name: r.receiver?.name || 'User',
          email: r.receiver?.email,
          avatar: r.receiver?.avatar,
          bio: r.receiver?.bio,
          requestId: r.id || r._id,
          type: 'outgoing'
        }));
    } else if (activeTab === 'suggestions') {
      list = suggestions.map(s => ({
        id: s.id || s._id,
        name: s.name,
        email: s.email,
        avatar: s.avatar,
        bio: s.bio,
        type: 'suggestion'
      }));
    }

    return list.filter(item => 
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeTab, friends, friendRequests, suggestions, searchQuery, currentUserId]);

  const renderUserItem = ({ item }) => {
    return (
      <View style={styles.userCard}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
        >
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userBio} numberOfLines={1}>
              {item.bio || item.email || 'No bio yet'}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.actionContainer}>
          {item.type === 'friend' && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.chatBtn]}
                onPress={() => navigation.navigate('ChatDetail', { 
                  userId: item.id, 
                  userName: item.name 
                })}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionBtn, styles.unfriendBtn]}
                onPress={() => removeFriend(item.id)}
              >
                <Ionicons name="person-remove-outline" size={18} color="#dc3545" />
              </TouchableOpacity>
            </View>
          )}

          {item.type === 'outgoing' && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.statusBadge, styles.pendingBadge]}>
                <Text style={styles.pendingText}>Requested</Text>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => removeFriend(item.id)}
              >
                <Text style={[styles.btnText, { color: '#dc3545' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.type === 'incoming' && (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => respondFriendRequest(item.requestId, 'accepted')}
              >
                <Text style={styles.btnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => respondFriendRequest(item.requestId, 'declined')}
              >
                <Text style={[styles.btnText, { color: '#dc3545' }]}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.type === 'suggestion' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.addBtn]}
              onPress={() => sendFriendRequest(item.id)}
            >
              <Ionicons name="person-add-outline" size={16} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff', marginLeft: 4 }]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const getEmptyMessage = () => {
    if (searchQuery) return 'No users match your search';
    switch (activeTab) {
      case 'friends': return 'You have no friends added yet.';
      case 'requests': return 'No incoming friend requests.';
      case 'sent': return 'No pending outgoing friend requests.';
      case 'suggestions': return 'No suggestions found at this moment.';
      default: return 'No users found';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Segmented Top Tab Bar */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { id: 'friends', label: `Friends (${friends.length})` },
            { 
              id: 'requests', 
              label: `Requests (${friendRequests.filter(r => (r.receiver?._id || r.receiver?.id || r.receiver) === currentUserId && r.status === 'pending').length})` 
            },
            { 
              id: 'sent', 
              label: `Sent (${friendRequests.filter(r => (r.sender?._id || r.sender?.id || r.sender) === currentUserId && r.status === 'pending').length})` 
            },
            { id: 'suggestions', label: `Suggestions (${suggestions.length})` },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, activeTab === tab.id && styles.activeTabItem]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main List */}
      {isLoadingUsers && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007bff" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  tabScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabItem: {
    backgroundColor: '#007bff',
  },
  tabText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#65676b',
  },
  activeTabText: {
    color: '#fff',
  },
  listContent: { paddingBottom: 40 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e7f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    backgroundColor: '#eee',
  },
  avatarText: { color: '#007bff', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: '600', color: '#1a1a1a' },
  userBio: { fontSize: 14, color: '#777', marginTop: 2, marginRight: 10 },
  separator: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 82 },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', fontSize: 16, marginTop: 10 },
  
  // Friend System Styles
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginLeft: 6,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  addBtn: {
    backgroundColor: '#007bff',
  },
  acceptBtn: {
    backgroundColor: '#28a745',
  },
  declineBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  chatBtn: {
    backgroundColor: '#007bff',
    paddingHorizontal: 8,
    borderRadius: 8,
    height: 30,
    width: 30,
  },
  unfriendBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f5c6cb',
    paddingHorizontal: 8,
    borderRadius: 8,
    height: 30,
    width: 30,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#e9ecef',
  },
  pendingText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
});