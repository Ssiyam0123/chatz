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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import { api } from '../api/api';

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

export default function ProfileScreen({ navigation }) {
  const { user, updateUser, logout } = useAuthStore();
  const {
    userPosts,
    friends,
    groups,
    fetchUserPosts,
    editPost,
    deletePost,
    toggleLikePost,
    addComment,
    sharePost,
    isLoadingUserPosts,
    hasMoreUserPosts
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

  const currentUserId = user?.id || user?._id;

  // Pagination States
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load user posts on mount
  useEffect(() => {
    if (currentUserId) {
      fetchUserPosts(currentUserId, 1, 15);
      setPage(1);
    }
  }, [currentUserId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    if (currentUserId) {
      await fetchUserPosts(currentUserId, 1, 15);
    }
    setRefreshing(false);
  }, [currentUserId]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreUserPosts || isLoadingUserPosts || !currentUserId) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const newPosts = await fetchUserPosts(currentUserId, nextPage, 15);
    if (newPosts && newPosts.length > 0) {
      setPage(nextPage);
    }
    setIsLoadingMore(false);
  }, [page, isLoadingMore, hasMoreUserPosts, isLoadingUserPosts, currentUserId]);

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
    setEditingPostId(post._id);
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
      return <Image source={{ uri: images[0] }} style={styles.postImage} resizeMode="cover" />;
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
            <Image key={idx} source={{ uri: img }} style={styles.carouselImage} resizeMode="cover" />
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
    const postUser = item.user || {};
    const commentsList = item.comments || [];
    const isCommentsVisible = !!visibleComments[item._id];

    // Find active reaction
    const userReaction = item.reactions?.find(r => (r.user?._id || r.user) === currentUserId);
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => handleStartEditPost(item)} style={{ padding: 6, marginRight: 8 }}>
              <Ionicons name="create-outline" size={20} color="#1877f2" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeletePost(item._id)} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={20} color="#e0245e" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Post Content */}
        {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}

        {/* Post Images */}
        {item.images && item.images.length > 0 ? (
          <PostImagesCarousel images={item.images} />
        ) : item.image ? (
          <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
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
              <Text style={styles.sharedContent}>{item.originalPost.content}</Text>
            ) : null}
            {item.originalPost.images && item.originalPost.images.length > 0 ? (
              <PostImagesCarousel images={item.originalPost.images} />
            ) : item.originalPost.image ? (
              <Image source={{ uri: item.originalPost.image }} style={styles.sharedImage} resizeMode="cover" />
            ) : null}
          </View>
        ) : null}

        {/* Counters */}
        <View style={styles.countersRow}>
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
            onPress={() => handlePostLike(item._id)}
            onLongPress={() => setActiveReactionPickerPostId(item._id)}
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
            onPress={() => setVisibleComments(prev => ({ ...prev, [item._id]: !prev[item._id] }))}
          >
            <View style={styles.actionIconRow}>
              <Ionicons name="chatbubble-outline" size={20} color="#65676b" />
              <Text style={styles.actionButtonText}>Comment</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleSharePost(item._id)}>
            <View style={styles.actionIconRow}>
              <Ionicons name="share-social-outline" size={20} color="#65676b" />
              <Text style={styles.actionButtonText}>Share</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Emoji Selector Overlay */}
        {activeReactionPickerPostId === item._id && (
          <View style={styles.reactionPickerContainer}>
            {REACTION_TYPES.map((rt) => (
              <TouchableOpacity
                key={rt.type}
                style={styles.reactionPickerEmojiButton}
                onPress={() => handlePostLike(item._id, rt.type)}
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
                const commentUser = comment.user || {};
                return (
                  <View key={comment._id || index} style={styles.commentItem}>
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
                value={commentInputs[item._id] || ''}
                onChangeText={(txt) => setCommentInputs({ ...commentInputs, [item._id]: txt })}
              />
              <TouchableOpacity
                style={styles.sendCommentBtn}
                onPress={() => handleAddComment(item._id)}
              >
                <Ionicons name="send" size={18} color="#1877f2" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={userPosts}
        renderItem={renderPostItem}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.postsList}
        ListHeaderComponent={
          <>
            {/* Profile Backdrop / Cover Picture Area */}
            <View style={styles.coverArea}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop' }}
                style={styles.coverImage}
              />
            </View>

            {/* Profile Card details container */}
            <View style={styles.profileDetailsContainer}>
              <View style={styles.avatarWrapper}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.profileAvatar} />
                ) : (
                  <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
                    <Text style={styles.avatarLargeText}>
                      {user?.name ? user.name[0].toUpperCase() : '?'}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.profileName}>{user?.name || 'Social User'}</Text>
              {user?.bio ? (
                <Text style={styles.profileBio}>{user.bio}</Text>
              ) : (
                <Text style={[styles.profileBio, { color: '#8a8d91', fontStyle: 'italic' }]}>No bio yet</Text>
              )}

              {/* Profile Action Buttons */}
              <View style={styles.profileButtonsRow}>
                <TouchableOpacity style={styles.editButton} onPress={handleOpenEditModal}>
                  <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                  <Ionicons name="log-out-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
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
              <Text style={styles.sectionTitle}>My Posts</Text>
            </View>

            {isLoadingUserPosts && !refreshing && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#1877f2" />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoadingUserPosts ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#8a8d91" />
              <Text style={styles.emptyText}>You haven't posted anything yet.</Text>
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0f2f5'
  },
  coverArea: {
    height: 180,
    width: '100%',
    backgroundColor: '#ddd'
  },
  coverImage: {
    width: '100%',
    height: '100%'
  },
  profileDetailsContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingBottom: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  avatarWrapper: {
    marginTop: -60,
    borderWidth: 4,
    borderColor: '#fff',
    borderRadius: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60
  },
  profileAvatarPlaceholder: {
    backgroundColor: '#1877f2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarLargeText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold'
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#050505',
    marginTop: 10
  },
  profileBio: {
    fontSize: 15,
    color: '#65676b',
    marginTop: 6,
    paddingHorizontal: 30,
    textAlign: 'center'
  },
  profileButtonsRow: {
    flexDirection: 'row',
    marginTop: 18,
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'center'
  },
  editButton: {
    backgroundColor: '#1877f2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    backgroundColor: '#e0245e'
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15
  },
  statsCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 12,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  statItem: {
    alignItems: 'center',
    flex: 1
  },
  statCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#050505'
  },
  statLabel: {
    fontSize: 13,
    color: '#65676b',
    marginTop: 4
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e4e6eb'
  },
  postsHeaderRow: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050505'
  },
  postsList: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative'
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  avatarPlaceholder: {
    backgroundColor: '#1877f2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  postHeaderInfo: {
    marginLeft: 10,
    flex: 1
  },
  postAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#050505'
  },
  postTime: {
    fontSize: 12,
    color: '#65676b',
    marginTop: 2
  },
  deleteButton: {
    padding: 6
  },
  postContent: {
    fontSize: 15,
    color: '#050505',
    lineHeight: 20,
    marginBottom: 10
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginBottom: 10
  },
  carouselContainer: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative'
  },
  carouselImage: {
    width: width - 32,
    height: 220
  },
  paginationDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center'
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3
  },
  paginationDotActive: {
    backgroundColor: '#1877f2'
  },
  paginationDotInactive: {
    backgroundColor: 'rgba(255,255,255,0.5)'
  },
  sharedPostContainer: {
    borderWidth: 1,
    borderColor: '#e4e6eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f8f9fa'
  },
  sharedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  sharedAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#050505'
  },
  sharedContent: {
    fontSize: 14,
    color: '#050505',
    marginTop: 6,
    marginBottom: 8
  },
  sharedImage: {
    width: '100%',
    height: 180,
    borderRadius: 6
  },
  countersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  counterText: {
    fontSize: 12,
    color: '#65676b'
  },
  reactionMiniEmoji: {
    fontSize: 12
  },
  actionsDivider: {
    height: 1,
    backgroundColor: '#e4e6eb',
    marginVertical: 8
  },
  postActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6
  },
  actionIconRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionButtonText: {
    fontSize: 13,
    color: '#65676b',
    fontWeight: '600',
    marginLeft: 6
  },
  actionButtonTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1877f2'
  },
  reactionPickerContainer: {
    position: 'absolute',
    bottom: 50,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000
  },
  reactionPickerEmojiButton: {
    padding: 6
  },
  reactionPickerEmoji: {
    fontSize: 24
  },
  commentsSection: {
    marginTop: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8
  },
  commentsList: {
    marginBottom: 8
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start'
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8
  },
  commentContentBg: {
    backgroundColor: '#e4e6eb',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flex: 1
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050505'
  },
  commentText: {
    fontSize: 13,
    color: '#050505',
    marginTop: 2
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e6eb',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 6,
    height: 38
  },
  commentInput: {
    flex: 1,
    fontSize: 13,
    color: '#050505',
    height: '100%',
    paddingVertical: 0
  },
  sendCommentBtn: {
    padding: 6
  },
  loaderContainer: {
    marginVertical: 40,
    alignItems: 'center'
  },
  emptyContainer: {
    marginVertical: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 15,
    color: '#8a8d91',
    marginTop: 10
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050505',
    marginBottom: 20,
    textAlign: 'center'
  },
  avatarPicker: {
    alignItems: 'center',
    marginBottom: 24,
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
    backgroundColor: '#1877f2',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  changeAvatarText: {
    fontSize: 14,
    color: '#1877f2',
    fontWeight: '600',
    marginTop: 8
  },
  inputContainer: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#65676b',
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced0d4',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#050505',
    backgroundColor: '#f8f9fa'
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#e4e6eb',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center'
  },
  cancelBtnText: {
    color: '#050505',
    fontWeight: 'bold',
    fontSize: 15
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#1877f2',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15
  }
});
