import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import useChatStore from '../stores/chatStore';
import { radii, spacing } from '../theme/blushDusk';
import { useTheme } from '../theme/ThemeContext';
import ReportModal from '../components/ui/ReportModal';

const EMPTY_ARRAY = [];


const MessageItem = React.memo(({ item, currentUserId, onReport }) => {
  const senderId = item.sender?._id || item.sender?.id || item.sender;
  const isMe = senderId === currentUserId || senderId?.toString() === currentUserId;

  return (
    <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
      <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
        {item.image && (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: item.image }}
              style={styles.messageImage}
              cachePolicy="memory-disk"
              recyclingKey={item.image}
              contentFit="cover"
            />
            {item.isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.uploadingText}>Sending…</Text>
              </View>
            )}
          </View>
        )}
        {item.text ? (
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
            {item.text}
          </Text>
        ) : null}
        <View style={styles.messageMeta}>
          <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>
            {item.createdAt && typeof item.createdAt !== 'undefined' && !isNaN(new Date(item.createdAt).getTime()) 
              ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : item.isUploading ? 'Sending...' : ''}
          </Text>
          {!isMe && !item.isUploading && (
            <TouchableOpacity
              onPress={() => onReport(item)}
              style={styles.reportMsgBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="flag-outline" size={12} color={colors.textSoft} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
});

export default function ChatScreen({ route }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = getStyles(colors);
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = getStyles(colors);
  const { userId: partnerId, userName } = route.params;
  const [inputText, setInputText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const flatListRef = useRef(null);
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();

  const user = useChatStore((state) => state.user);
  const currentUserId = user?.id || user?._id;
  
  const messages = useChatStore((state) => state.privateMessagesCache[partnerId] || EMPTY_ARRAY);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const fetchChatHistory = useChatStore((state) => state.fetchChatHistory);
  const uploadAndSendImage = useChatStore((state) => state.uploadAndSendImage);
  const uploadingImage = useChatStore((state) => state.uploadingImage);

  // Friend Request system hooks
  const friends = useChatStore((state) => state.friends);
  const friendRequests = useChatStore((state) => state.friendRequests);
  const sendFriendRequest = useChatStore((state) => state.sendFriendRequest);
  const respondFriendRequest = useChatStore((state) => state.respondFriendRequest);
  const removeFriend = useChatStore((state) => state.removeFriend);

  const isFriend = friends.some((f) => (f._id || f.id) === partnerId);
  const incomingRequest = friendRequests.find(
    (r) =>
      (r.sender?._id || r.sender?.id || r.sender) === partnerId &&
      (r.receiver?._id || r.receiver?.id || r.receiver) === currentUserId
  );
  const outgoingRequest = friendRequests.find(
    (r) =>
      (r.sender?._id || r.sender?.id || r.sender) === currentUserId &&
      (r.receiver?._id || r.receiver?.id || r.receiver) === partnerId
  );

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    const setActiveChatPartnerId = useChatStore.getState().setActiveChatPartnerId;
    const clearActiveChatPartnerId = useChatStore.getState().clearActiveChatPartnerId;
    
    setActiveChatPartnerId(partnerId);
    if (isFriend) {
      fetchChatHistory(partnerId);
    }

    return () => {
      clearActiveChatPartnerId();
    };
  }, [partnerId, isFriend]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.headerBtn}>
            <Ionicons name="call-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.headerBtn}>
            <Ionicons name="videocam-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  // Reverse messages for inverted FlatList (newest first)
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(partnerId, inputText.trim());
    setInputText('');
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadAndSendImage(result.assets[0], 'private', partnerId, '');
    }
  };

  const handleReportMessage = useCallback((message) => {
    setReportTarget({ type: 'message', id: message.id || message._id });
    setReportModalVisible(true);
  }, []);

  const renderMessage = useCallback(({ item }) => (
    <MessageItem item={item} currentUserId={currentUserId} onReport={handleReportMessage} />
  ), [currentUserId, handleReportMessage]);

  const handleLoadOlderMessages = useCallback(() => {
    if (!isFriend || messages.length === 0) return;
    const oldestMessage = messages[0]; // messages are chronological, so first = oldest
    if (oldestMessage?.createdAt) {
      fetchChatHistory(partnerId, oldestMessage.createdAt);
    }
  }, [isFriend, messages, partnerId, fetchChatHistory]);

  const ChatContent = (
    <View style={styles.inner}>
      <FlatList
        ref={flatListRef}
        data={invertedMessages}
        inverted
        keyExtractor={(item, index) => item.id || item._id || item.clientId || `msg-${index}`}
        renderItem={renderMessage}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={15}
        contentContainerStyle={styles.messagesList}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onEndReached={handleLoadOlderMessages}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isFriend ? (
            <Text style={styles.emptyText}>Start a conversation with {userName}</Text>
          ) : (
            <View style={styles.lockedHistoryContainer}>
              <Ionicons name="shield-half" size={48} color={colors.textSoft} style={{ marginBottom: 10 }} />
              <Text style={styles.lockedHistoryText}>Chat history is locked until you are friends.</Text>
            </View>
          )
        }
      />

      {isFriend ? (
        <View style={styles.inputWrapper}>
          <View style={styles.inputBar}>
            <TouchableOpacity onPress={pickImage} style={styles.attachButton} disabled={uploadingImage}>
              <Ionicons name="image-outline" size={24} color={uploadingImage ? colors.textSoft : colors.secondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message..."
              placeholderTextColor={colors.textSoft}
              multiline
              blurOnSubmit={false}
              onSubmitEditing={isWeb ? handleSend : undefined}
            />
            <TouchableOpacity onPress={handleSend} disabled={!inputText.trim()}>
              <View style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}>
                <Ionicons name="send" size={18} color={colors.white} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.lockBanner}>
          <Ionicons name="lock-closed" size={22} color={colors.textMuted} />
          <Text style={styles.lockText}>
            You can only message users who are in your friends list.
          </Text>
          
          {incomingRequest && (
            <TouchableOpacity
              style={[styles.bannerBtn, styles.acceptBannerBtn]}
              onPress={() => respondFriendRequest(incomingRequest.id || incomingRequest._id, 'accepted')}
              activeOpacity={0.85}
            >
              <Text style={styles.bannerBtnText}>Accept Friend Request</Text>
            </TouchableOpacity>
          )}

          {outgoingRequest && (
            <TouchableOpacity
              style={[styles.bannerBtn, styles.pendingBannerBtn]}
              onPress={() => removeFriend(partnerId)}
              activeOpacity={0.85}
            >
              <Text style={[styles.bannerBtnText, { color: colors.danger }]}>Cancel Request</Text>
            </TouchableOpacity>
          )}

          {!incomingRequest && !outgoingRequest && (
            <TouchableOpacity
              style={[styles.bannerBtn, styles.addBannerBtn]}
              onPress={() => sendFriendRequest(partnerId)}
              activeOpacity={0.85}
            >
              <Text style={styles.bannerBtnText}>Add Friend to Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {isWeb ? (
        <View style={styles.container}>{ChatContent}</View>
      ) : (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={headerHeight + 10}
        >
          {ChatContent}
        </KeyboardAvoidingView>
      )}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>This feature will be coming soon</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        targetType={reportTarget?.type}
        targetId={reportTarget?.id}
        targetName={`Message from ${userName}`}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  inner: { flex: 1, backgroundColor: colors.background },
  headerRight: { flexDirection: 'row' },
  headerBtn: { marginRight: 12 },
  messagesList: { paddingHorizontal: spacing.lg, paddingTop: 20, paddingBottom: spacing.sm },
  messageRow: { marginBottom: spacing.sm, flexDirection: 'row' },
  myMessageRow: { justifyContent: 'flex-end' },
  theirMessageRow: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.medium,
  },
  myBubble: { backgroundColor: colors.primarySoft, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  messageText: { fontSize: 15, lineHeight: 21 },
  myMessageText: { color: colors.text },
  theirMessageText: { color: colors.text },
  messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  timeText: { fontSize: 10 },
  myTime: { color: colors.textMuted },
  theirTime: { color: colors.textSoft },
  reportMsgBtn: { marginLeft: 6, padding: 2 },
  imageWrapper: { position: 'relative' },
  messageImage: { width: 220, height: 165, borderRadius: radii.small, marginBottom: 4, backgroundColor: colors.surfaceMuted },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay, borderRadius: radii.small, justifyContent: 'center', alignItems: 'center' },
  uploadingText: { color: colors.white, fontSize: 12, marginTop: 4 },
  inputWrapper: { padding: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, maxHeight: 100, fontSize: 15, color: colors.text, paddingTop: spacing.sm, paddingBottom: spacing.sm, outlineStyle: 'none', paddingLeft: spacing.xs },
  sendBtn: { marginLeft: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 2, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  emptyText: { color: colors.textSoft, fontStyle: 'italic', textAlign: 'center', marginTop: 50 },
  attachButton: { justifyContent: 'center', alignItems: 'center', padding: spacing.xs },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.overlay },
  modalContent: { backgroundColor: colors.surface, padding: spacing.xl, borderRadius: radii.medium, alignItems: 'center', width: '80%' },
  modalText: { fontSize: 16, marginBottom: spacing.xl, textAlign: 'center', color: colors.text },
  modalButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radii.small },
  modalButtonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  
  // Friend System Locks
  lockedHistoryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: spacing.xxl,
  },
  lockedHistoryText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  lockBanner: {
    padding: spacing.xl,
    backgroundColor: colors.backgroundAlt,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  bannerBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 44,
  },
  addBannerBtn: {
    backgroundColor: colors.primary,
  },
  acceptBannerBtn: {
    backgroundColor: colors.success,
  },
  pendingBannerBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});