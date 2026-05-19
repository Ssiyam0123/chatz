import React, { useEffect, useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useChatStore from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';

export default function PeopleScreen({ navigation }) {
  const { 
    users, 
    isLoadingUsers, 
    fetchUsers,
    friends,
    friendRequests,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    fetchFriends,
    fetchFriendRequests
  } = useChatStore();
  const currentUserId = useAuthStore((state) => state.user?.id || state.user?._id);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchFriends();
    fetchFriendRequests();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchUsers(), fetchFriends(), fetchFriendRequests()]);
    setRefreshing(false);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u._id !== currentUserId &&
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery, currentUserId]);

  const getUserFriendship = (userId) => {
    const isFriend = friends.some((f) => (f._id || f.id) === userId);
    if (isFriend) return { status: 'friends' };

    const incoming = friendRequests.find(
      (r) =>
        (r.sender?._id || r.sender) === userId &&
        (r.receiver?._id || r.receiver) === currentUserId
    );
    if (incoming) return { status: 'received_pending', request: incoming };

    const outgoing = friendRequests.find(
      (r) =>
        (r.sender?._id || r.sender) === currentUserId &&
        (r.receiver?._id || r.receiver) === userId
    );
    if (outgoing) return { status: 'sent_pending', request: outgoing };

    return { status: 'none' };
  };

  const renderUserItem = ({ item }) => {
    const { status, request } = getUserFriendship(item._id);

    return (
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        
        <View style={styles.actionContainer}>
          {status === 'friends' && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.chatBtn]}
                onPress={() => navigation.navigate('ChatDetail', { 
                  userId: item._id, 
                  userName: item.name 
                })}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionBtn, styles.unfriendBtn]}
                onPress={() => removeFriend(item._id)}
              >
                <Ionicons name="person-remove-outline" size={18} color="#dc3545" />
              </TouchableOpacity>
            </View>
          )}

          {status === 'sent_pending' && (
            <View style={[styles.statusBadge, styles.pendingBadge]}>
              <Text style={styles.pendingText}>Requested</Text>
            </View>
          )}

          {status === 'received_pending' && (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => respondFriendRequest(request._id, 'accepted')}
              >
                <Text style={styles.btnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => respondFriendRequest(request._id, 'declined')}
              >
                <Text style={[styles.btnText, { color: '#dc3545' }]}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'none' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.addBtn]}
              onPress={() => sendFriendRequest(item._id)}
            >
              <Ionicons name="person-add-outline" size={16} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff', marginLeft: 4 }]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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

      {isLoadingUsers && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007bff" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>
                {searchQuery ? "No users match your search" : "No users found"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  listContent: { paddingBottom: 20 },
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
  avatarText: { color: '#007bff', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: '600', color: '#1a1a1a' },
  userEmail: { fontSize: 14, color: '#777', marginTop: 2 },
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