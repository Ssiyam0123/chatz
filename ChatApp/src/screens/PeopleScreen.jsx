import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import useChatStore from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { radii, spacing } from '../theme/blushDusk';
import { useTheme } from '../theme/ThemeContext';

const PeopleItemSeparator = () => <View style={styles.separatorLine} />;

export default function PeopleScreen({ navigation }) {
    const { colors, isDark, toggleTheme } = useTheme();
  styles = getStyles(colors);
const { 
    users, 
    isLoadingUsers, 
    fetchUsers,
    friends,
    friendRequests,
    suggestions,
    hasMoreSuggestions,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    fetchFriends,
    fetchFriendRequests,
    fetchSuggestions,
  } = useChatStore();

  const currentUserId = useAuthStore((state) => state.user?.id || state.user?._id);
  const [activeTab, setActiveTab] = useState('suggestions'); // 'friends' | 'requests' | 'sent' | 'suggestions'
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Suggestions Pagination States
  const [suggestionsPage, setSuggestionsPage] = useState(1);
  const [loadingMoreSuggestions, setLoadingMoreSuggestions] = useState(false);

  const lastFetchedRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchedRef.current > 30000) {
        fetchUsers();
        fetchFriends();
        fetchFriendRequests();
        fetchSuggestions(1, 15);
        setSuggestionsPage(1);
        lastFetchedRef.current = now;
      }
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setSuggestionsPage(1);
    await Promise.all([
      fetchUsers(), 
      fetchFriends(), 
      fetchFriendRequests(),
      fetchSuggestions(1, 15)
    ]);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (activeTab === 'suggestions' && !loadingMoreSuggestions && hasMoreSuggestions) {
      setLoadingMoreSuggestions(true);
      const nextPage = suggestionsPage + 1;
      const newSugs = await fetchSuggestions(nextPage, 15);
      if (newSugs && newSugs.length > 0) {
        setSuggestionsPage(nextPage);
      }
      setLoadingMoreSuggestions(false);
    }
  };

  // Fetch users from backend when search query changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(false, searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Compute display list based on active tab and search query
  const displayData = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      // Map global search results from users state
      return users.map(u => {
        const isFriend = friends.some(f => (f.id || f._id) === (u.id || u._id));
        const incomingRequest = friendRequests.find(r => 
          (r.sender?.id || r.sender?._id) === (u.id || u._id) && 
          (r.receiver?._id || r.receiver?.id || r.receiver) === currentUserId && 
          r.status === 'pending'
        );
        const outgoingRequest = friendRequests.find(r => 
          (r.receiver?.id || r.receiver?._id) === (u.id || u._id) && 
          (r.sender?._id || r.sender?.id || r.sender) === currentUserId && 
          r.status === 'pending'
        );

        let type = 'suggestion';
        let requestId = null;
        if (isFriend) {
          type = 'friend';
        } else if (incomingRequest) {
          type = 'incoming';
          requestId = incomingRequest.id || incomingRequest._id;
        } else if (outgoingRequest) {
          type = 'outgoing';
          requestId = outgoingRequest.id || outgoingRequest._id;
        }

        return {
          id: u.id || u._id,
          name: u.name,
          email: u.email,
          avatar: u.avatar,
          bio: u.bio,
          type,
          requestId
        };
      });
    }

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

    return list;
  }, [activeTab, friends, friendRequests, suggestions, users, searchQuery, currentUserId]);

  const renderUserItem = ({ item }) => {
    return (
      <View style={styles.userCard}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
        >
          {item.avatar ? (
            <Image
              source={{ uri: item.avatar }}
              style={styles.avatarImage}
              cachePolicy="memory-disk"
              recyclingKey={item.avatar}
              contentFit="cover"
            />
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
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSoft}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSoft} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Segmented Top Tab Bar */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { id: 'friends', label: 'Friends' },
            { id: 'requests', label: 'Requests' },
            { id: 'sent', label: 'Sent' },
            { id: 'suggestions', label: 'Suggestions' },
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
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={PeopleItemSeparator}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={7}
          initialNumToRender={15}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMoreSuggestions ? (
              <ActivityIndicator style={{ padding: 15 }} color={colors.primary} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={colors.textSoft} />
              <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

let styles;
const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.small,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 15,
    color: colors.text,
    outlineStyle: 'none',
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tabItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTabItem: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTabText: {
    color: colors.white,
  },
  listContent: { paddingBottom: 40 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  avatarText: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: colors.text },
  userBio: { fontSize: 13, color: colors.textMuted, marginTop: 2, marginRight: spacing.sm },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 82 },
  separatorLine: { height: 1, backgroundColor: colors.border, marginLeft: 82 },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { color: colors.textMuted, fontSize: 15, marginTop: spacing.sm },
  
  // Friend System Styles
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    marginLeft: spacing.xs,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  addBtn: {
    backgroundColor: colors.primary,
  },
  acceptBtn: {
    backgroundColor: colors.success,
  },
  declineBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  chatBtn: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    height: 34,
    width: 34,
  },
  unfriendBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    height: 34,
    width: 34,
  },
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  pendingBadge: {
    backgroundColor: colors.backgroundAlt,
  },
  pendingText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
});