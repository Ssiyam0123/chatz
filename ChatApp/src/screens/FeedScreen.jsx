import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import useChatStore from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { uploadImage } from '../api/api';

const { width, height } = Dimensions.get('window');

const REACTION_TYPES = [
  { type: 'like', label: 'Like', emoji: '👍', color: '#3b5998' },
  { type: 'love', label: 'Love', emoji: '❤️', color: '#e0245e' },
  { type: 'haha', label: 'Haha', emoji: '😂', color: '#f5a623' },
  { type: 'wow', label: 'Wow', emoji: '😮', color: '#f5a623' },
  { type: 'sad', label: 'Sad', emoji: '😢', color: '#f5a623' },
  { type: 'angry', label: 'Angry', emoji: '😡', color: '#dd2e44' },
];

export default function FeedScreen({ navigation }) {
  const { user } = useAuthStore();
  const {
    posts,
    stories,
    suggestions,
    fetchPosts,
    fetchStories,
    fetchSuggestions,
    createPost,
    editPost,
    deletePost,
    toggleLikePost,
    toggleReactionComment,
    addComment,
    sharePost,
    createStory,
    viewStory,
    sendFriendRequest,
    isLoadingPosts,
    isLoadingStories,
    isLoadingSuggestions,
    hasMorePosts,
  } = useChatStore();

  // Create Post states
  const [postText, setPostText] = useState('');
  const [postImages, setPostImages] = useState([]); // Support multiple images
  const [isPosting, setIsPosting] = useState(false);

  // Edit Post states
  const [editPostModalVisible, setEditPostModalVisible] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostText, setEditPostText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Active comment text inputs by post ID: { [postId]: text }
  const [commentInputs, setCommentInputs] = useState({});
  // Toggled post comment visibility: { [postId]: boolean }
  const [visibleComments, setVisibleComments] = useState({});

  // Story Viewer Modal states
  const [activeStoryGroup, setActiveStoryGroup] = useState(null); // { user, stories }
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isCreatingStory, setIsCreatingStory] = useState(false);

  // Inline Reaction Picker states
  const [reactionPickerPostId, setReactionPickerPostId] = useState(null);
  const [reactionPickerCommentId, setReactionPickerCommentId] = useState(null);

  // Modals for viewer/reactant lists
  const [reactedUsersModalData, setReactedUsersModalData] = useState(null);
  const [storyViewersModalData, setStoryViewersModalData] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    fetchPosts(1, 15);
    fetchStories();
    fetchSuggestions();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setPage(1);
    await Promise.all([
      fetchPosts(1, 15),
      fetchStories(),
      fetchSuggestions()
    ]);
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMorePosts || isLoadingPosts) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const newPosts = await fetchPosts(nextPage, 15);
    if (newPosts && newPosts.length > 0) {
      setPage(nextPage);
    }
    setIsLoadingMore(false);
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator color="#007bff" />
      </View>
    );
  };

  // Handle start editing a post
  const handleStartEditPost = (post) => {
    setEditingPostId(post._id);
    setEditPostText(post.content || '');
    setEditPostModalVisible(true);
  };

  // Submit edited post
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
      fetchPosts(); // Refresh post feed
    } catch (err) {
      Alert.alert('Edit Failed', err.message || 'Could not update post');
    } finally {
      setIsEditing(false);
    }
  };

  // Delete a post
  const handleDeletePost = (postId) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(postId);
              Alert.alert('Success', 'Post deleted successfully');
              fetchPosts();
            } catch (err) {
              Alert.alert('Error', 'Could not delete post');
            }
          },
        },
      ]
    );
  };

  // Send friend request from suggestions list
  const handleSendFriendRequest = async (receiverId) => {
    try {
      await sendFriendRequest(receiverId);
      Alert.alert('Request Sent', 'Friend request sent successfully!');
      fetchSuggestions(); // Refresh suggestions
    } catch (err) {
      console.error(err);
    }
  };

  // Story view seen-by logging effect
  useEffect(() => {
    if (activeStoryGroup) {
      const currentStory = activeStoryGroup.stories[activeStoryIndex];
      if (currentStory && currentStory._id) {
        viewStory(currentStory._id);
      }
    }
  }, [activeStoryGroup, activeStoryIndex]);

  // Post images selection
  const handlePickPostImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const selectedUris = result.assets.map(asset => asset.uri);
      setPostImages([...postImages, ...selectedUris]);
    }
  };

  // Submit new post
  const handleCreatePost = async () => {
    if (!postText.trim() && postImages.length === 0) {
      Alert.alert('Post Error', 'Please type some text or attach at least one photo.');
      return;
    }

    setIsPosting(true);
    try {
      const uploadedUrls = [];
      for (const uri of postImages) {
        const url = await uploadImage({ uri });
        if (url) {
          uploadedUrls.push(url);
        }
      }
      await createPost(postText, uploadedUrls);
      setPostText('');
      setPostImages([]);
      fetchPosts(); // Refresh post feed
    } catch (err) {
      Alert.alert('Post Failed', err.message || 'Could not create post');
    } finally {
      setIsPosting(false);
    }
  };

  // Select and upload a Story
  const handleAddStory = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.7,
    });

    if (!result.canceled) {
      setIsCreatingStory(true);
      try {
        const imageUrl = await uploadImage({ uri: result.assets[0].uri });
        await createStory(imageUrl, 'New Story');
        Alert.alert('Story Created', 'Your story has been uploaded successfully!');
        fetchStories();
      } catch (err) {
        Alert.alert('Story Upload Failed', err.message || 'Could not create story');
      } finally {
        setIsCreatingStory(false);
      }
    }
  };

  // Trigger post reaction
  const handleReactionSelect = async (postId, reactionType) => {
    try {
      await toggleLikePost(postId, reactionType);
      setReactionPickerPostId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger comment reaction
  const handleCommentReactionSelect = async (postId, commentId, reactionType) => {
    try {
      await toggleReactionComment(postId, commentId, reactionType);
      setReactionPickerCommentId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Submit comment
  const handleAddCommentSubmit = async (postId) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    try {
      await addComment(postId, text.trim());
      setCommentInputs({ ...commentInputs, [postId]: '' });
    } catch (err) {
      Alert.alert('Comment Failed', 'Could not add comment');
    }
  };

  // Share/repost post
  const handleShare = (postId) => {
    Alert.prompt(
      'Share Post',
      'Add a caption to this shared post (optional):',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Share Now',
          onPress: async (caption) => {
            try {
              await sharePost(postId, caption);
              Alert.alert('Success', 'Post shared successfully!');
              fetchPosts();
            } catch (err) {
              Alert.alert('Share Failed', 'Could not share post');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  // Render post image slider/carousel
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
            const slide = Math.round(e.nativeEvent.contentOffset.x / (width - 20));
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

  // Render horizontal story list item
  const renderStoryCircle = ({ item }) => {
    const userAvatar = item.user.avatar;
    const userName = item.user.name;

    return (
      <TouchableOpacity
        style={styles.storyCircleContainer}
        onPress={() => {
          setActiveStoryGroup(item);
          setActiveStoryIndex(0);
        }}
      >
        <View style={styles.storyRing}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.storyAvatar} />
          ) : (
            <View style={[styles.storyAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{userName[0].toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.storyName} numberOfLines={1}>
          {userName}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render individual post feed item
  const renderPostItem = ({ item }) => {
    const postUser = item.user || {};
    const commentsList = item.comments || [];
    const isCommentsVisible = !!visibleComments[item._id];

    // Find active reaction
    const currentUserId = user?.id || user?._id;
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
          <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
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
          </View>
          {currentUserId === (postUser._id || postUser.id) && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={{ padding: 6, marginRight: 8 }}
                onPress={() => handleStartEditPost(item)}
              >
                <Ionicons name="create-outline" size={20} color="#1877f2" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 6 }}
                onPress={() => handleDeletePost(item._id)}
              >
                <Ionicons name="trash-outline" size={20} color="#ff4d4d" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Post Content */}
        {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}

        {/* Post Images or single Image */}
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

        {/* Inline Reaction Picker Popover */}
        {reactionPickerPostId === item._id && (
          <View style={styles.reactionPickerContainer}>
            {REACTION_TYPES.map((reaction) => (
              <TouchableOpacity
                key={reaction.type}
                style={styles.reactionPickerEmojiBtn}
                onPress={() => handleReactionSelect(item._id, reaction.type)}
              >
                <Text style={styles.reactionPickerEmoji}>{reaction.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onLongPress={() => setReactionPickerPostId(item._id)}
            onPress={() => {
              if (activeReaction) {
                handleReactionSelect(item._id, activeReaction.type);
              } else {
                handleReactionSelect(item._id, 'like');
              }
            }}
          >
            {activeReaction ? (
              <Text style={{ fontSize: 16 }}>{activeReaction.emoji}</Text>
            ) : (
              <Ionicons name="thumbs-up-outline" size={20} color="#666" />
            )}
            <Text
              style={[
                styles.actionBtnText,
                activeReaction && { color: activeReaction.color, fontWeight: 'bold' }
              ]}
            >
              {activeReaction ? activeReaction.label : 'Like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              setVisibleComments({ ...visibleComments, [item._id]: !isCommentsVisible })
            }
          >
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.actionBtnText}>Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item._id)}>
            <Ionicons name="share-social-outline" size={20} color="#666" />
            <Text style={styles.actionBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Inline Comments Section */}
        {isCommentsVisible && (
          <View style={styles.commentsSection}>
            {commentsList.map((comm, idx) => {
              const commReactions = comm.reactions || [];
              const userCommReact = commReactions.find(r => (r.user?._id || r.user) === currentUserId);
              const activeCommReact = REACTION_TYPES.find(rt => rt.type === userCommReact?.type);
              
              return (
                <View key={comm._id || idx} style={styles.commentContainer}>
                  <View style={styles.commentItem}>
                    {comm.user?.avatar ? (
                      <Image source={{ uri: comm.user.avatar }} style={styles.commentAvatar} />
                    ) : (
                      <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                        <Text style={[styles.avatarText, { fontSize: 10 }]}>
                          {comm.user?.name ? comm.user.name[0].toUpperCase() : '?'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentAuthor}>{comm.user?.name || 'User'}</Text>
                      <Text style={styles.commentText}>{comm.text}</Text>
                      
                      {/* Mini comment reactions list */}
                      {commReactions.length > 0 && (
                        <View style={styles.commentReactionsBadge}>
                          {commReactions.slice(0, 3).map((r, i) => (
                            <Text key={i} style={{ fontSize: 10 }}>
                              {REACTION_TYPES.find(rt => rt.type === r.type)?.emoji}
                            </Text>
                          ))}
                          <Text style={styles.commentReactionsBadgeText}>{commReactions.length}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Comment interaction buttons */}
                  <View style={styles.commentActionRow}>
                    <TouchableOpacity
                      onLongPress={() => setReactionPickerCommentId(comm._id)}
                      onPress={() => {
                        if (activeCommReact) {
                          handleCommentReactionSelect(item._id, comm._id, activeCommReact.type);
                        } else {
                          handleCommentReactionSelect(item._id, comm._id, 'like');
                        }
                      }}
                    >
                      <Text style={[
                        styles.commentActionText,
                        activeCommReact && { color: activeCommReact.color, fontWeight: 'bold' }
                      ]}>
                        {activeCommReact ? `${activeCommReact.emoji} ${activeCommReact.label}` : 'React'}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Inline Picker popover inside comment */}
                    {reactionPickerCommentId === comm._id && (
                      <View style={styles.commentReactionPicker}>
                        {REACTION_TYPES.map((reaction) => (
                          <TouchableOpacity
                            key={reaction.type}
                            style={styles.commentReactionPickerEmojiBtn}
                            onPress={() => handleCommentReactionSelect(item._id, comm._id, reaction.type)}
                          >
                            <Text style={styles.commentReactionPickerEmoji}>{reaction.emoji}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Comment Input */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor="#999"
                value={commentInputs[item._id] || ''}
                onChangeText={(text) => setCommentInputs({ ...commentInputs, [item._id]: text })}
              />
              <TouchableOpacity
                style={styles.commentSendBtn}
                onPress={() => handleAddCommentSubmit(item._id)}
              >
                <Ionicons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const isMyStoryGroup = activeStoryGroup?.user?._id === user?._id || activeStoryGroup?.user?.id === user?._id;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListHeaderComponent={
            <>
              {/* Active Stories List */}
              <View style={styles.storiesContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 15 }}>
                  {/* Add Story Circle */}
                  <TouchableOpacity style={styles.storyCircleContainer} onPress={handleAddStory}>
                    <View style={styles.addStoryOutline}>
                      {user?.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.addStoryAvatar} />
                      ) : (
                        <View style={[styles.addStoryAvatar, styles.avatarPlaceholder, { backgroundColor: '#bbb' }]}>
                          <Text style={styles.avatarText}>+</Text>
                        </View>
                      )}
                      <View style={styles.plusBadge}>
                        <Ionicons name="add" size={16} color="#fff" />
                      </View>
                    </View>
                    <Text style={styles.storyName} numberOfLines={1}>
                      Add Story
                    </Text>
                  </TouchableOpacity>

                  {/* Loader for story creation */}
                  {isCreatingStory && (
                    <View style={[styles.storyCircleContainer, { justifyContent: 'center' }]}>
                      <ActivityIndicator color="#007bff" />
                      <Text style={styles.storyName}>Uploading...</Text>
                    </View>
                  )}

                  {/* Friends' Stories */}
                  <FlatList
                    data={stories}
                    renderItem={renderStoryCircle}
                    keyExtractor={(item) => item.user._id}
                    horizontal
                    scrollEnabled={false}
                  />
                </ScrollView>
              </View>

              {/* Create Post Header */}
              <View style={styles.createPostCard}>
                <View style={styles.createPostRow}>
                  {user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.createPostAvatar} />
                  ) : (
                    <View style={[styles.createPostAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {user?.name ? user.name[0].toUpperCase() : 'U'}
                      </Text>
                    </View>
                  )}
                  <TextInput
                    style={styles.createPostInput}
                    placeholder={`What's on your mind, ${user?.name || 'Friend'}?`}
                    placeholderTextColor="#777"
                    multiline
                    value={postText}
                    onChangeText={setPostText}
                  />
                </View>

                {/* Uploaded images horizontal preview */}
                {postImages.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
                    {postImages.map((uri, idx) => (
                      <View key={idx} style={styles.imagePreviewItem}>
                        <Image source={{ uri }} style={styles.imagePreviewSmall} />
                        <TouchableOpacity
                          style={styles.removeImageBtnSmall}
                          onPress={() => setPostImages(postImages.filter((_, i) => i !== idx))}
                        >
                          <Ionicons name="close-circle" size={18} color="#ff4d4d" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}

                <View style={styles.createPostDivider} />

                <View style={styles.createPostActions}>
                  <TouchableOpacity style={styles.mediaOptionBtn} onPress={handlePickPostImages}>
                    <Ionicons name="image" size={22} color="#4caf50" />
                    <Text style={styles.mediaOptionText}>Photos</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.publishPostBtn, isPosting && { backgroundColor: '#a0cfff' }]}
                    disabled={isPosting}
                    onPress={handleCreatePost}
                  >
                    {isPosting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.publishPostText}>Post</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* People You May Know Section */}
              {suggestions && suggestions.length > 0 ? (
                <View style={styles.suggestionsContainer}>
                  <View style={styles.suggestionsHeader}>
                    <Text style={styles.suggestionsTitle}>People You May Know</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionsScroll}
                  >
                    {suggestions.map((item) => (
                      <View key={item._id} style={styles.suggestionCard}>
                        {item.avatar ? (
                          <Image source={{ uri: item.avatar }} style={styles.suggestionAvatar} />
                        ) : (
                          <View style={[styles.suggestionAvatar, styles.avatarPlaceholder, { width: 55, height: 55, borderRadius: 27.5 }]}>
                            <Text style={[styles.avatarText, { fontSize: 20 }]}>
                              {item.name ? item.name[0].toUpperCase() : '?'}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.suggestionName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.suggestionBio} numberOfLines={1}>
                          {item.bio || 'No bio yet'}
                        </Text>
                        <TouchableOpacity
                          style={styles.addFriendBtn}
                          onPress={() => handleSendFriendRequest(item._id)}
                        >
                          <Ionicons name="person-add" size={13} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={styles.addFriendText}>Add Friend</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {isLoadingPosts && <ActivityIndicator style={{ marginTop: 20, marginBottom: 10 }} color="#007bff" />}
            </>
          }
          ListEmptyComponent={
            !isLoadingPosts ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="newspaper-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No posts yet. Be the first to share something!</Text>
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
      </KeyboardAvoidingView>

      {/* Story Viewer Modal */}
      {activeStoryGroup && (
        <Modal visible={true} transparent={false} animationType="slide">
          <View style={styles.storyViewerContainer}>
            {/* Safe Area Header inside fullscreen story */}
            <SafeAreaView style={styles.storyHeaderOverlay}>
              {/* Progress Bar Indicators */}
              <View style={styles.progressBarRow}>
                {activeStoryGroup.stories.map((s, idx) => (
                  <View
                    key={s._id}
                    style={[
                      styles.progressBarItem,
                      idx <= activeStoryIndex ? styles.progressBarFilled : styles.progressBarEmpty,
                    ]}
                  />
                ))}
              </View>

              {/* Author Row */}
              <View style={styles.storyAuthorRow}>
                {activeStoryGroup.user.avatar ? (
                  <Image source={{ uri: activeStoryGroup.user.avatar }} style={styles.viewerAvatar} />
                ) : (
                  <View style={[styles.viewerAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {activeStoryGroup.user.name[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.viewerAuthorName}>{activeStoryGroup.user.name}</Text>

                <TouchableOpacity
                  style={styles.closeStoryBtn}
                  onPress={() => setActiveStoryGroup(null)}
                >
                  <Ionicons name="close" size={30} color="#fff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* Story Image */}
            <Image
              source={{ uri: activeStoryGroup.stories[activeStoryIndex].image }}
              style={styles.storyViewerImage}
              resizeMode="contain"
            />

            {/* Story Caption / Text */}
            {activeStoryGroup.stories[activeStoryIndex].text ? (
              <View style={styles.captionContainer}>
                <Text style={styles.captionText}>
                  {activeStoryGroup.stories[activeStoryIndex].text}
                </Text>
              </View>
            ) : null}

            {/* Seen-by views list triggers (only for current user's story) */}
            {isMyStoryGroup && (
              <TouchableOpacity
                style={styles.seenByContainer}
                onPress={() => setStoryViewersModalData(activeStoryGroup.stories[activeStoryIndex].viewers || [])}
              >
                <Ionicons name="eye-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.seenByText}>
                  Seen by {(activeStoryGroup.stories[activeStoryIndex].viewers || []).length}
                </Text>
              </TouchableOpacity>
            )}

            {/* Left and Right navigation overlays */}
            <View style={styles.navOverlayRow}>
              {/* Left trigger */}
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => {
                  if (activeStoryIndex > 0) {
                    setActiveStoryIndex(activeStoryIndex - 1);
                  } else {
                    setActiveStoryGroup(null);
                  }
                }}
              />
              {/* Right trigger */}
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => {
                  if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
                    setActiveStoryIndex(activeStoryIndex + 1);
                  } else {
                    setActiveStoryGroup(null);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Reacted Users Modal */}
      <Modal
        visible={!!reactedUsersModalData}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReactedUsersModalData(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reactions</Text>
              <TouchableOpacity onPress={() => setReactedUsersModalData(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={reactedUsersModalData}
              keyExtractor={(item, index) => item._id || index.toString()}
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

      {/* Story Viewers Modal */}
      <Modal
        visible={!!storyViewersModalData}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStoryViewersModalData(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Viewer List</Text>
              <TouchableOpacity onPress={() => setStoryViewersModalData(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={storyViewersModalData}
              keyExtractor={(item, index) => item._id || index.toString()}
              renderItem={({ item }) => (
                <View style={styles.reactantRow}>
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.reactantAvatar} />
                  ) : (
                    <View style={[styles.reactantAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {item.name ? item.name[0].toUpperCase() : '?'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.reactantName}>{item.name || 'Friend'}</Text>
                </View>
              )}
              style={{ maxHeight: 300 }}
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#666' }}>No views yet</Text>
                </View>
              }
            />
          </View>
        </View>
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Post</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditPostModalVisible(false);
                  setEditingPostId(null);
                  setEditPostText('');
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={{
                minHeight: 100,
                backgroundColor: '#f0f2f5',
                borderRadius: 8,
                padding: 10,
                textAlignVertical: 'top',
                color: '#333',
                fontSize: 16,
              }}
              multiline
              value={editPostText}
              onChangeText={setEditPostText}
              placeholder="Edit your post..."
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#e4e6eb',
                  marginRight: 10,
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  borderRadius: 6,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => {
                  setEditPostModalVisible(false);
                  setEditingPostId(null);
                  setEditPostText('');
                }}
              >
                <Text style={{ color: '#333', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#1877f2',
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  borderRadius: 6,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={handleSaveEditPost}
                disabled={isEditing}
              >
                {isEditing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f6',
  },
  suggestionsHeader: {
    marginBottom: 10,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c1e21',
  },
  suggestionsScroll: {
    paddingRight: 10,
  },
  suggestionCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e6eb',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: 130,
    alignItems: 'center',
  },
  suggestionAvatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginBottom: 8,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1e21',
    textAlign: 'center',
    marginBottom: 2,
  },
  suggestionBio: {
    fontSize: 11,
    color: '#606770',
    textAlign: 'center',
    marginBottom: 10,
    height: 15,
  },
  addFriendBtn: {
    backgroundColor: '#1877f2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    width: '100%',
  },
  addFriendText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  storiesContainer: {
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f6',
    marginBottom: 10,
  },
  storyCircleContainer: {
    alignItems: 'center',
    marginRight: 15,
    width: 70,
  },
  addStoryOutline: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  addStoryAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#007bff',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  storyName: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  avatarPlaceholder: {
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Create Post
  createPostCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  createPostRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  createPostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  createPostInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#333',
    paddingTop: 8,
    minHeight: 44,
  },
  imagePreviewScroll: {
    marginTop: 12,
    flexDirection: 'row',
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreviewSmall: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageBtnSmall: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
  },
  createPostDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  createPostActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f1f8e9',
  },
  mediaOptionText: {
    marginLeft: 6,
    color: '#4caf50',
    fontWeight: '600',
    fontSize: 13,
  },
  publishPostBtn: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  publishPostText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Post Card
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    position: 'relative',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  postHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  postAuthor: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  postTime: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 21,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
  },

  // Carousel Layout
  carouselContainer: {
    width: '100%',
    marginBottom: 12,
  },
  carouselImage: {
    width: width - 50,
    height: 250,
    borderRadius: 8,
    marginRight: 10,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#007bff',
    width: 12,
  },
  paginationDotInactive: {
    backgroundColor: '#ccc',
  },

  // Shared posts
  sharedPostContainer: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  sharedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  sharedAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  sharedContent: {
    fontSize: 14,
    color: '#444',
    lineHeight: 19,
    marginBottom: 8,
  },
  sharedImage: {
    width: '100%',
    height: 180,
    borderRadius: 6,
  },

  // Post Action Row
  countersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
    marginBottom: 8,
  },
  counterItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionMiniEmoji: {
    fontSize: 14,
  },
  counterText: {
    fontSize: 12,
    color: '#777',
    marginLeft: 4,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
    marginBottom: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  actionBtnText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666',
  },

  // Reaction Picker Container
  reactionPickerContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    borderRadius: 30,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 100,
  },
  reactionPickerEmojiBtn: {
    paddingHorizontal: 8,
  },
  reactionPickerEmoji: {
    fontSize: 24,
  },

  // Comments Section
  commentsSection: {
    marginTop: 8,
    backgroundColor: '#fcfdfd',
    paddingTop: 8,
  },
  commentContainer: {
    marginBottom: 10,
    position: 'relative',
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentBubble: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#f0f2f5',
    borderRadius: 12,
    padding: 10,
    position: 'relative',
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 13.5,
    color: '#333',
    lineHeight: 18,
  },
  commentReactionsBadge: {
    position: 'absolute',
    bottom: -8,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  commentReactionsBadgeText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2,
  },
  commentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 52,
    marginTop: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: '#666',
    marginRight: 15,
  },
  commentReactionPicker: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 200,
  },
  commentReactionPickerEmojiBtn: {
    paddingHorizontal: 4,
  },
  commentReactionPickerEmoji: {
    fontSize: 18,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
    height: 36,
  },
  commentSendBtn: {
    backgroundColor: '#007bff',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Empty List
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 30,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },

  // Story Viewer Overlay
  storyViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    position: 'relative',
  },
  storyHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 30,
  },
  progressBarRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  progressBarItem: {
    flex: 1,
    height: 3,
    marginHorizontal: 2,
    borderRadius: 1.5,
  },
  progressBarFilled: {
    backgroundColor: '#fff',
  },
  progressBarEmpty: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  storyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  viewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  viewerAuthorName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
  },
  closeStoryBtn: {
    padding: 5,
  },
  storyViewerImage: {
    width: width,
    height: height * 0.75,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
    borderRadius: 10,
  },
  captionText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
  },
  seenByContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    zIndex: 15,
  },
  seenByText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  navOverlayRow: {
    position: 'absolute',
    top: 100,
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 5,
  },

  // Global Modals Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 15,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  reactantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  reactantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reactantName: {
    fontSize: 14.5,
    color: '#333',
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  reactantEmoji: {
    fontSize: 20,
  },
});
