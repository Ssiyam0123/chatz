import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/api';
import { radii, spacing } from '../theme/blushDusk';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/ui/Avatar';
import ExpandableText from '../components/ui/ExpandableText';
import PrimaryButton from '../components/ui/PrimaryButton';
import ReportModal from '../components/ui/ReportModal';

const { width } = Dimensions.get('window');

// Constants
const REACTION_TYPES = [
  { type: 'like', label: 'Like', emoji: '👍', color: '#3b5998' },
  { type: 'love', label: 'Love', emoji: '❤️', color: '#e0245e' },
  { type: 'haha', label: 'Haha', emoji: '😂', color: '#f5a623' },
  { type: 'wow', label: 'Wow', emoji: '😮', color: '#f5a623' },
  { type: 'sad', label: 'Sad', emoji: '😢', color: '#f5a623' },
  { type: 'angry', label: 'Angry', emoji: '😡', color: '#dd2e44' },
];

export default function ProfileScreen({ route, navigation }) {
    const { colors: themeColors, isDark, toggleTheme } = useTheme();
  colors = themeColors;
  styles = getStyles(colors);
const { user, updateUser, logout } = useAuthStore();
  const {
    userPosts,
    friends,
    friendRequests,
    groups,
    fetchUserPosts,
    editPost,
    deletePost,
    toggleLikePost,
    addComment,
    sharePost,
    isLoadingUserPosts,
    hasMoreUserPosts,
    fetchFriends,
    fetchFriendRequests,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend
  } = useChatStore();

  const [refreshing, setRefreshing] = useState(false);
  
  // Edit Profile States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Edit Post States
  const [editPostModalVisible, setEditPostModalVisible] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostText, setEditPostText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Post Interaction States
  const [commentInputs, setCommentInputs] = useState({});
  const [visibleComments, setVisibleComments] = useState({});
  const [activeReactionPickerPostId, setActiveReactionPickerPostId] = useState(null);
  const [reactedUsersModalData, setReactedUsersModalData] = useState(null);
  
  // Report Modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState({ type: 'user', id: null, name: '' });

  const handleReportUser = () => {
    setReportTarget({ type: 'user', id: targetUserId, name: displayedUser?.name || 'user' });
    setReportModalVisible(true);
  };

  const currentUserId = user?.id || user?._id;
  const routeParamsUserId = route?.params?.userId;
  const targetUserId = routeParamsUserId || currentUserId;
  const isOwnProfile = targetUserId === currentUserId;

  const [displayedUser, setDisplayedUser] = useState(isOwnProfile ? user : null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(!isOwnProfile);

  // Pagination States
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch target user profile from server
  useEffect(() => {
    if (!targetUserId) {
      console.error('ProfileScreen: targetUserId is undefined! user object in store:', user);
      setIsLoadingProfile(false);
      return;
    }
    
    setIsLoadingProfile(true);
    api.get(`/user/profile/${targetUserId}`)
      .then(res => {
        if (res.data.status === 'success') {
          const fetchedUser = res.data.data.user;
          setDisplayedUser(fetchedUser);
          if (isOwnProfile) {
            updateUser(fetchedUser);
          }
        }
      })
      .catch(err => {
        console.error('Error fetching user profile:', err);
        if (isOwnProfile) {
          setDisplayedUser(user);
        }
      })
      .finally(() => setIsLoadingProfile(false));
  }, [targetUserId]);

  // Sync displayedUser with local user state when store updates (e.g. after edit)
  useEffect(() => {
    if (isOwnProfile) {
      setDisplayedUser(user);
    }
  }, [user, isOwnProfile]);

  // Load user posts and check friends/requests on focus
  useFocusEffect(
    useCallback(() => {
      if (targetUserId) {
        fetchUserPosts(targetUserId, 1, 15);
        setPage(1);
      }
      fetchFriends();
      fetchFriendRequests();
    }, [targetUserId])
  );

  const getUserFriendship = () => {
    if (isOwnProfile || !targetUserId) return { status: 'none', request: null };
    const isFriend = friends.some((f) => (f._id || f.id) === targetUserId);
    if (isFriend) return { status: 'friends', request: null };

    const incoming = friendRequests.find(
      (r) =>
        (r.sender?._id || r.sender?.id || r.sender) === targetUserId &&
        (r.receiver?._id || r.receiver?.id || r.receiver) === currentUserId
    );
    if (incoming) return { status: 'received_pending', request: incoming };

    const outgoing = friendRequests.find(
      (r) =>
        (r.sender?._id || r.sender?.id || r.sender) === currentUserId &&
        (r.receiver?._id || r.receiver?.id || r.receiver) === targetUserId
    );
    if (outgoing) return { status: 'sent_pending', request: outgoing };

    return { status: 'none', request: null };
  };

  const { status: friendshipStatus, request: friendshipRequest } = getUserFriendship();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    if (targetUserId) {
      await fetchUserPosts(targetUserId, 1, 15);
    }
    setRefreshing(false);
  }, [targetUserId]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreUserPosts || isLoadingUserPosts || !targetUserId) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const newPosts = await fetchUserPosts(targetUserId, nextPage, 15);
    if (newPosts && newPosts.length > 0) {
      setPage(nextPage);
    }
    setIsLoadingMore(false);
  }, [page, isLoadingMore, hasMoreUserPosts, isLoadingUserPosts, targetUserId]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator color="#007bff" />
      </View>
    );
  }, [isLoadingMore]);

  const handleOpenEditModal = () => {
    setEditName(user?.name || '');
    setEditBio(user?.bio || '');
    setEditAvatar(user?.avatar || null);
    setEditModalVisible(true);
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow photo gallery access to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled) {
      setEditAvatar(result.assets[0].uri);
    }
  };

  const handlePickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow photo gallery access to change your cover photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      const coverUri = result.assets[0].uri;
      setSavingProfile(true);
      try {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          const response = await fetch(coverUri);
          const blob = await response.blob();
          formData.append('coverPhoto', blob, 'cover.jpg');
        } else {
          const uriParts = coverUri.split('.');
          const fileType = uriParts[uriParts.length - 1] || 'jpg';
          formData.append('coverPhoto', {
            uri: coverUri,
            name: `cover.${fileType}`,
            type: `image/${fileType}`,
          });
        }

        const response = await api.put('/user/profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data.status === 'success') {
          updateUser(response.data.data.user);
          setDisplayedUser(response.data.data.user);
          Alert.alert('Success', 'Cover photo updated successfully!');
        }
      } catch (err) {
        console.error('Error updating cover:', err);
        Alert.alert('Error', 'Failed to upload cover photo');
      } finally {
        setSavingProfile(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('bio', editBio.trim());

      if (editAvatar && editAvatar !== user?.avatar) {
        if (Platform.OS === 'web') {
          const response = await fetch(editAvatar);
          const blob = await response.blob();
          formData.append('avatar', blob, 'avatar.jpg');
        } else {
          const uriParts = editAvatar.split('.');
          const fileType = uriParts[uriParts.length - 1] || 'jpg';
          formData.append('avatar', {
            uri: editAvatar,
            name: `avatar.${fileType}`,
            type: `image/${fileType}`,
          });
        }
      }

      const response = await api.put('/user/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.status === 'success') {
        updateUser(response.data.data.user);
        Alert.alert('Success', 'Profile updated successfully!');
        setEditModalVisible(false);
      }
    } catch (error) {
      console.error('Save Profile Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Could not save profile details.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeletePost = (postId) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to permanently delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(postId);
              Alert.alert('Success', 'Post deleted.');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete post.');
            }
          }
        }
      ]
    );
  };

  const handleStartEditPost = (post) => {
    setEditingPostId(post.id || post._id);
    setEditPostText(post.content || '');
    setEditPostModalVisible(true);
  };

  const handleSaveEditPost = async () => {
    if (!editPostText.trim()) {
      Alert.alert('Edit Error', 'Post content cannot be empty.');
      return;
    }
    setIsEditing(true);
    try {
      await editPost(editingPostId, editPostText.trim());
      setEditPostModalVisible(false);
      setEditingPostId(null);
      setEditPostText('');
      if (currentUserId) {
        fetchUserPosts(currentUserId);
      }
    } catch (err) {
      Alert.alert('Edit Failed', err.message || 'Could not update post');
    } finally {
      setIsEditing(false);
    }
  };

  const handlePostLike = async (postId, reactionType = 'like') => {
    try {
      await toggleLikePost(postId, reactionType);
      setActiveReactionPickerPostId(null);
    } catch (err) {
      console.error('Like toggle error:', err);
    }
  };

  const handleAddComment = async (postId) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    try {
      await addComment(postId, text.trim());
      setCommentInputs({ ...commentInputs, [postId]: '' });
    } catch (err) {
      Alert.alert('Error', 'Could not add comment.');
    }
  };

  const handleSharePost = (postId) => {
    Alert.prompt(
      'Share Post',
      'Add a caption to this shared post (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: async (caption) => {
            try {
              await sharePost(postId, caption);
              Alert.alert('Success', 'Post shared successfully!');
              if (currentUserId) {
                fetchUserPosts(currentUserId);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to share post.');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  // Local PostImagesCarousel component
  const PostImagesCarousel = ({ images }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    if (!images || images.length === 0) return null;
    if (images.length === 1) {
      return <Image source={{ uri: images[0] }} style={styles.postImage} contentFit="contain" />;
    }
    return (
      <View style={styles.carouselContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const slide = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
            if (slide !== activeIndex) {
              setActiveIndex(slide);
            }
          }}
          scrollEventThrottle={16}
        >
          {images.map((img, idx) => (
            <Image key={idx} source={{ uri: img }} style={styles.carouselImage} contentFit="contain" />
          ))}
        </ScrollView>
        <View style={styles.paginationDots}>
          {images.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.paginationDot,
                activeIndex === idx ? styles.paginationDotActive : styles.paginationDotInactive
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderPostItem = ({ item }) => {
    const postId = item.id || item._id;
    const postUser = item.user || {};
    const commentsList = item.comments || [];
    const isCommentsVisible = !!visibleComments[postId];

    // Find active reaction
    const userReaction = item.reactions?.find(r => (r.user?._id || r.user?.id || r.user) === currentUserId);
    const activeReaction = REACTION_TYPES.find(rt => rt.type === userReaction?.type);

    // Compute unique emojis
    const reactionsList = item.reactions || [];
    const uniqueEmojiTypes = [...new Set(reactionsList.map(r => r.type))];
    const uniqueEmojis = uniqueEmojiTypes
      .map(t => REACTION_TYPES.find(rt => rt.type === t)?.emoji)
      .filter(Boolean);

    return (
      <View style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          {postUser.avatar ? (
            <Image source={{ uri: postUser.avatar }} style={styles.postAvatar} />
          ) : (
            <View style={[styles.postAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {postUser.name ? postUser.name[0].toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <View style={styles.postHeaderInfo}>
            <Text style={styles.postAuthor}>{postUser.name || 'Unknown User'}</Text>
            <Text style={styles.postTime}>
              {new Date(item.createdAt).toLocaleDateString()} at{' '}
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          {isOwnProfile && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => handleStartEditPost(item)} style={{ padding: spacing.xs, marginRight: spacing.sm }}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeletePost(postId)} style={{ padding: spacing.xs }}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Post Content */}
        {item.content ? <ExpandableText text={item.content} style={styles.postContent} /> : null}

        {/* Post Images */}
        {item.images && item.images.length > 0 ? (
          <PostImagesCarousel images={item.images} />
        ) : item.image ? (
          <Image source={{ uri: item.image }} style={styles.postImage} contentFit="contain" />
        ) : null}

        {/* Shared Post Container */}
        {item.originalPost ? (
          <View style={styles.sharedPostContainer}>
            <View style={styles.postHeader}>
              {item.originalPost.user?.avatar ? (
                <Image source={{ uri: item.originalPost.user.avatar }} style={styles.sharedAvatar} />
              ) : (
                <View style={[styles.sharedAvatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {item.originalPost.user?.name ? item.originalPost.user.name[0].toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              <View style={styles.postHeaderInfo}>
                <Text style={styles.sharedAuthor}>{item.originalPost.user?.name || 'Shared User'}</Text>
                <Text style={styles.postTime}>
                  {new Date(item.originalPost.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
            {item.originalPost.content ? (
              <ExpandableText text={item.originalPost.content} style={styles.sharedContent} />
            ) : null}
            {item.originalPost.images && item.originalPost.images.length > 0 ? (
              <PostImagesCarousel images={item.originalPost.images} />
            ) : item.originalPost.image ? (
              <Image source={{ uri: item.originalPost.image }} style={styles.sharedImage} contentFit="contain" />
            ) : null}
          </View>
        ) : null}

        {/* Counters */}
        <View style={styles.countersRow}>
          <TouchableOpacity
            style={styles.counterItem}
            disabled={reactionsList.length === 0}
            onPress={() => setReactedUsersModalData(reactionsList)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {uniqueEmojis.slice(0, 3).map((emoji, i) => (
                <Text key={i} style={[styles.reactionMiniEmoji, { marginLeft: i > 0 ? -4 : 0 }]}>
                  {emoji}
                </Text>
              ))}
              <Text style={styles.counterText}>
                {reactionsList.length > 0 ? ` ${reactionsList.length}` : ' 0'}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.counterText}>{commentsList.length} Comments</Text>
            <Text style={[styles.counterText, { marginLeft: 10 }]}>
              {item.shares ? item.shares.length : 0} Shares
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsDivider} />
        <View style={styles.postActionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePostLike(postId)}
            onLongPress={() => setActiveReactionPickerPostId(postId)}
          >
            {activeReaction ? (
              <Text style={styles.actionButtonTextActive}>
                {activeReaction.emoji} {activeReaction.label}
              </Text>
            ) : (
              <View style={styles.actionIconRow}>
                <Ionicons name="thumbs-up-outline" size={20} color="#65676b" />
                <Text style={styles.actionButtonText}>Like</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setVisibleComments(prev => ({ ...prev, [postId]: !prev[postId] }))}
          >
            <View style={styles.actionIconRow}>
              <Ionicons name="chatbubble-outline" size={20} color="#65676b" />
              <Text style={styles.actionButtonText}>Comment</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleSharePost(postId)}>
            <View style={styles.actionIconRow}>
              <Ionicons name="share-social-outline" size={20} color="#65676b" />
              <Text style={styles.actionButtonText}>Share</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Emoji Selector Overlay */}
        {activeReactionPickerPostId === postId && (
          <View style={styles.reactionPickerContainer}>
            {REACTION_TYPES.map((rt) => (
              <TouchableOpacity
                key={rt.type}
                style={styles.reactionPickerEmojiButton}
                onPress={() => handlePostLike(postId, rt.type)}
              >
                <Text style={styles.reactionPickerEmoji}>{rt.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Expandable Comments Area */}
        {isCommentsVisible && (
          <View style={styles.commentsSection}>
            <View style={styles.commentsList}>
              {commentsList.map((comment, index) => {
                const commentId = comment.id || comment._id;
                const commentUser = comment.user || {};
                return (
                  <View key={commentId || index} style={styles.commentItem}>
                    {commentUser.avatar ? (
                      <Image source={{ uri: commentUser.avatar }} style={styles.commentAvatar} />
                    ) : (
                      <View style={[styles.commentAvatar, styles.avatarPlaceholder, { width: 32, height: 32, borderRadius: 16 }]}>
                        <Text style={[styles.avatarText, { fontSize: 12 }]}>
                          {commentUser.name ? commentUser.name[0].toUpperCase() : '?'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.commentContentBg}>
                      <Text style={styles.commentAuthor}>{commentUser.name || 'User'}</Text>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor="#8a8d91"
                value={commentInputs[postId] || ''}
                onChangeText={(txt) => setCommentInputs({ ...commentInputs, [postId]: txt })}
              />
              <TouchableOpacity
                style={styles.sendCommentBtn}
                onPress={() => handleAddComment(postId)}
              >
                <Ionicons name="send" size={18} color="#1877f2" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const hasHeader = !!route?.params?.userId || (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack());

  return (
    <SafeAreaView style={[styles.screen, hasHeader && { paddingTop: 0 }]}>
      <FlatList
        data={userPosts}
        renderItem={renderPostItem}
        keyExtractor={item => item.id || item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.postsList}
        ListHeaderComponent={
          <>
            {/* Profile Backdrop / Cover Picture Area */}
            <View style={styles.coverArea}>
              <Image
                source={{ uri: displayedUser?.coverPhoto || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop' }}
                style={styles.coverImage}
              />
              {isOwnProfile && (
                <TouchableOpacity style={styles.changeCoverBadge} onPress={handlePickCover} activeOpacity={0.8}>
                  <Ionicons name="camera" size={16} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.changeCoverText}>Edit Cover</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Profile Card details container */}
            <View style={styles.profileDetailsContainer}>
              <View style={styles.avatarWrapper}>
                <Avatar uri={displayedUser?.avatar} name={displayedUser?.name} size="xxl" />
              </View>

              <Text style={styles.profileName}>{displayedUser?.name || 'Social User'}</Text>
              {displayedUser?.bio ? (
                <Text style={styles.profileBio}>{displayedUser.bio}</Text>
              ) : (
                <Text style={[styles.profileBio, { color: colors.textSoft, fontStyle: 'italic' }]}>No bio yet</Text>
              )}

              {/* Profile Action Buttons */}
              <View style={styles.profileButtonsRow}>
                {isOwnProfile ? (
                  <>
                    <TouchableOpacity style={styles.editButton} onPress={handleOpenEditModal} activeOpacity={0.85}>
                      <Ionicons name="create-outline" size={18} color={colors.white} style={{ marginRight: 6 }} />
                      <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.85}>
                      <Ionicons name="log-out-outline" size={18} color={colors.danger} style={{ marginRight: 6 }} />
                      <Text style={styles.logoutButtonText}>Log Out</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.editButton, { marginRight: spacing.sm }]}
                      onPress={() => navigation.navigate('ChatDetail', { 
                        userId: targetUserId, 
                        userName: displayedUser?.name || 'User' 
                      })}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.white} style={{ marginRight: 6 }} />
                      <Text style={styles.editButtonText}>Message</Text>
                    </TouchableOpacity>

                    {friendshipStatus === 'friends' && (
                      <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={() => removeFriend(targetUserId)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="person-remove-outline" size={18} color={colors.danger} style={{ marginRight: 6 }} />
                        <Text style={styles.logoutButtonText}>Unfriend</Text>
                      </TouchableOpacity>
                    )}

                    {friendshipStatus === 'sent_pending' && (
                      <TouchableOpacity
                        style={[styles.logoutButton, { borderColor: colors.textMuted }]}
                        onPress={() => removeFriend(targetUserId)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
                        <Text style={[styles.logoutButtonText, { color: colors.textMuted }]}>Cancel Request</Text>
                      </TouchableOpacity>
                    )}

                    {friendshipStatus === 'received_pending' && (
                      <View style={{ flexDirection: 'row', flex: 1 }}>
                        <TouchableOpacity
                          style={[styles.editButton, { backgroundColor: colors.success, marginRight: spacing.sm }]}
                          onPress={() => respondFriendRequest(friendshipRequest.id || friendshipRequest._id, 'accepted')}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.editButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.logoutButton, { borderColor: colors.danger }]}
                          onPress={() => respondFriendRequest(friendshipRequest.id || friendshipRequest._id, 'declined')}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.logoutButtonText, { color: colors.danger }]}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {friendshipStatus === 'none' && (
                      <TouchableOpacity
                        style={[styles.editButton, { backgroundColor: colors.success, marginRight: 0 }]}
                        onPress={() => sendFriendRequest(targetUserId)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="person-add-outline" size={18} color={colors.white} style={{ marginRight: 6 }} />
                        <Text style={styles.editButtonText}>Add Friend</Text>
                      </TouchableOpacity>
                    )}
                    {/* Report User Button */}
                    {!isOwnProfile && (
                      <TouchableOpacity
                        style={[styles.logoutButton, { borderColor: colors.textSoft, marginLeft: spacing.sm, flex: 0, paddingHorizontal: spacing.md }]}
                        onPress={() => handleReportUser()}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="flag-outline" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statCount}>{userPosts?.length || 0}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statCount}>{friends?.length || 0}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statCount}>{groups?.length || 0}</Text>
                <Text style={styles.statLabel}>Groups</Text>
              </View>
            </View>

            {/* User's Posts Section */}
            <View style={styles.postsHeaderRow}>
              <Text style={styles.sectionTitle}>
                {isOwnProfile ? 'Posts' : `Posts`}
              </Text>
            </View>

            {isLoadingUserPosts && !refreshing && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoadingUserPosts ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={colors.textSoft} />
              <Text style={styles.emptyText}>
                {isOwnProfile ? "You haven't posted anything yet." : `${displayedUser?.name || 'This user'} hasn't posted anything yet.`}
              </Text>
            </View>
          ) : null
        }
        // Virtualization Performance Optimizations
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={30}
      />

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarPicker}>
              {editAvatar ? (
                <Image source={{ uri: editAvatar }} style={styles.previewAvatar} />
              ) : (
                <View style={[styles.previewAvatar, styles.profileAvatarPlaceholder, { width: 90, height: 90, borderRadius: 45 }]}>
                  <Text style={[styles.avatarLargeText, { fontSize: 32 }]}>
                    {user?.name ? user.name[0].toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
              <Text style={styles.changeAvatarText}>Change Avatar</Text>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#8a8d91"
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Describe yourself..."
                placeholderTextColor="#8a8d91"
                multiline
                numberOfLines={3}
                value={editBio}
                onChangeText={setEditBio}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.cancelBtn}
                disabled={savingProfile}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleSaveProfile}
                style={styles.saveBtn}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={editPostModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setEditPostModalVisible(false);
          setEditingPostId(null);
          setEditPostText('');
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Post</Text>

            <TextInput
              style={{
                minHeight: 100,
                backgroundColor: '#f0f2f5',
                borderRadius: 8,
                padding: 10,
                textAlignVertical: 'top',
                color: '#333',
                fontSize: 16,
                marginTop: 10,
              }}
              multiline
              value={editPostText}
              onChangeText={setEditPostText}
              placeholder="Edit your post..."
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setEditPostModalVisible(false);
                  setEditingPostId(null);
                  setEditPostText('');
                }}
                style={styles.cancelBtn}
                disabled={isEditing}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleSaveEditPost}
                style={styles.saveBtn}
                disabled={isEditing}
              >
                {isEditing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reacted Users Modal */}
      <Modal
        visible={!!reactedUsersModalData}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReactedUsersModalData(null)}
      >
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { marginBottom: 0, textAlign: 'left' }]}>Reactions</Text>
              <TouchableOpacity onPress={() => setReactedUsersModalData(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={reactedUsersModalData}
              keyExtractor={(item, index) => item.id || item._id || index.toString()}
              renderItem={({ item }) => {
                const reactant = item.user || {};
                const rType = REACTION_TYPES.find(rt => rt.type === item.type);
                return (
                  <View style={styles.reactantRow}>
                    {reactant.avatar ? (
                      <Image source={{ uri: reactant.avatar }} style={styles.reactantAvatar} />
                    ) : (
                      <View style={[styles.reactantAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>
                          {reactant.name ? reactant.name[0].toUpperCase() : '?'}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.reactantName}>{reactant.name || 'Anonymous'}</Text>
                    <Text style={styles.reactantEmoji}>{rType?.emoji}</Text>
                  </View>
                );
              }}
              style={{ maxHeight: 300 }}
            />
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        targetType={reportTarget.type}
        targetId={reportTarget.id}
        targetName={reportTarget.name}
      />
    </SafeAreaView>
  );
}

let styles;
let colors;
const getStyles = (colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  coverArea: {
    height: 180,
    width: '100%',
    backgroundColor: colors.surfaceMuted
  },
  coverImage: {
    width: '100%',
    height: '100%'
  },
  changeCoverBadge: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.small,
  },
  changeCoverText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  profileDetailsContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radii.medium,
    borderBottomRightRadius: radii.medium,
    shadowColor: '#382F38',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  avatarWrapper: {
    marginTop: -55,
    borderWidth: 3,
    borderColor: colors.surface,
    borderRadius: 60,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm
  },
  profileBio: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xxl,
    textAlign: 'center'
  },
  profileButtonsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    width: '100%',
    paddingHorizontal: spacing.xl,
    justifyContent: 'center'
  },
  editButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.small,
    flex: 1,
    marginRight: spacing.sm,
    minHeight: 46,
  },
  editButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.small,
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: 'transparent',
    minHeight: 46,
  },
  logoutButtonText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14
  },
  statsCard: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radii.medium,
    shadowColor: '#382F38',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1
  },
  statItem: {
    alignItems: 'center',
    flex: 1
  },
  statCount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  },
  statLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border
  },
  postsHeaderRow: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  },
  postsList: {
    paddingBottom: 120,
    flexGrow: 1
  },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative'
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  avatarPlaceholder: {
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16
  },
  postHeaderInfo: {
    marginLeft: spacing.sm,
    flex: 1
  },
  postAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text
  },
  postTime: {
    fontSize: 11,
    color: colors.textSoft,
    marginTop: 2
  },
  deleteButton: {
    padding: spacing.xs
  },
  postContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm
  },
  postImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#000',
    borderRadius: radii.small,
    marginBottom: spacing.sm
  },
  carouselContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radii.small,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    position: 'relative'
  },
  carouselImage: {
    width: width - 32,
    aspectRatio: 4 / 3,
    backgroundColor: '#000'
  },
  paginationDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center'
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3
  },
  paginationDotActive: {
    backgroundColor: colors.primary
  },
  paginationDotInactive: {
    backgroundColor: 'rgba(255,255,255,0.5)'
  },
  sharedPostContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background
  },
  sharedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  sharedAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text
  },
  sharedContent: {
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.sm
  },
  sharedImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#000',
    borderRadius: radii.small
  },
  countersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs
  },
  counterText: {
    fontSize: 12,
    color: colors.textMuted
  },
  reactionMiniEmoji: {
    fontSize: 12
  },
  actionsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm
  },
  postActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs
  },
  actionIconRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionButtonText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    marginLeft: spacing.xs
  },
  actionButtonTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary
  },
  reactionPickerContainer: {
    position: 'absolute',
    bottom: 50,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#382F38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000
  },
  reactionPickerEmojiButton: {
    padding: spacing.xs
  },
  reactionPickerEmoji: {
    fontSize: 24
  },
  commentsSection: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.small,
    padding: spacing.sm
  },
  commentsList: {
    marginBottom: spacing.sm
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-start'
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.sm
  },
  commentContentBg: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.medium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flex: 1
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text
  },
  commentText: {
    fontSize: 13,
    color: colors.text,
    marginTop: 2
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    height: 38
  },
  commentInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    height: '100%',
    paddingVertical: 0,
    outlineStyle: 'none',
  },
  sendCommentBtn: {
    padding: spacing.xs
  },
  loaderContainer: {
    marginVertical: spacing.section,
    alignItems: 'center'
  },
  emptyContainer: {
    marginVertical: spacing.section,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.large,
    borderTopRightRadius: radii.large,
    padding: spacing.xl,
    minHeight: 400
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: 'center'
  },
  avatarPicker: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    position: 'relative',
    alignSelf: 'center'
  },
  previewAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 22,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface
  },
  changeAvatarText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm
  },
  inputContainer: {
    marginBottom: spacing.lg
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    outlineStyle: 'none',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    paddingVertical: spacing.md,
    borderRadius: radii.small,
    marginRight: spacing.sm,
    alignItems: 'center'
  },
  cancelBtnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.small,
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15
  },
  counterItem: {
    paddingVertical: spacing.xs,
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerModalContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  reactantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  reactantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reactantName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    marginLeft: spacing.md,
    flex: 1,
  },
  reactantEmoji: {
    fontSize: 20,
  },
});
