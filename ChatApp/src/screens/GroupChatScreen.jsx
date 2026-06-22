import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import useChatStore from '../stores/chatStore';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { radii, spacing } from '../theme/blushDusk';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/ui/Avatar';
import ReportModal from '../components/ui/ReportModal';

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

const GroupMessageItem = React.memo(({ item, currentUserId, onReport }) => {
  const senderId = item.sender?.id || item.sender?._id || item.sender;
  const isMe = senderId === currentUserId || senderId?.toString() === currentUserId;

  return (
    <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
      {!isMe && (
        <View style={styles.senderAvatarWrap}>
          <Avatar uri={item.sender?.avatar} name={item.sender?.name} size="sm" />
        </View>
      )}
      <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
        {!isMe && <Text style={styles.senderName}>{item.sender?.name || 'Unknown'}</Text>}
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
                <ActivityIndicator color={colors.white} />
                <Text style={styles.uploadingText}>Sending…</Text>
              </View>
            )}
          </View>
        )}
        {item.text ? <Text style={isMe ? styles.myMessageText : styles.otherMessageText}>{item.text}</Text> : null}
        <View style={styles.groupMsgMeta}>
          <Text style={[styles.time, isMe ? styles.myTime : styles.otherTime]}>
            {item.createdAt && typeof item.createdAt !== 'undefined' && !isNaN(new Date(item.createdAt).getTime())
              ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : item.isUploading ? 'Sending...' : ''}
          </Text>
          {!isMe && !item.isUploading && (
            <TouchableOpacity
              onPress={() => onReport(item)}
              style={styles.reportGMsgBtn}
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



export default function GroupChatScreen({ route, navigation }) {
    const { colors, isDark, toggleTheme } = useTheme();
  const styles = getStyles(colors);
const { groupId, groupName } = route.params;
  const [inputText, setInputText] = React.useState('');
  const [reportModalVisible, setReportModalVisible] = React.useState(false);
  const [reportTarget, setReportTarget] = React.useState(null);
  const flatListRef = useRef(null);
  const headerHeight = useHeaderHeight();

  const user = useChatStore(state => state.user);
  const currentUserId = user?.id || user?._id;
  
  const messages = useChatStore(state => state.groupMessagesCache[groupId] || EMPTY_ARRAY);
  const typingUsers = useChatStore(state => state.typingUsers[groupId] || EMPTY_OBJECT);
  const uploadingImage = useChatStore(state => state.uploadingImage);
  
  const fetchGroupMessages = useChatStore(state => state.fetchGroupMessages);
  const sendGroupMessage = useChatStore(state => state.sendGroupMessage);
  const uploadAndSendImage = useChatStore(state => state.uploadAndSendImage);
  const setTypingGroup = useChatStore(state => state.setTypingGroup);

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: spacing.md, padding: spacing.xs }}
          onPress={() => navigation.navigate('GroupDetails', { groupId, groupName })}
        >
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, groupId, groupName]);

  useEffect(() => {
    fetchGroupMessages(groupId);
  }, [groupId]);

  // Reverse messages for inverted FlatList (newest first)
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendGroupMessage(groupId, inputText);
    setInputText('');
    stopTyping();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadAndSendImage(result.assets[0], 'group', groupId, '');
    }
  };

  const stopTyping = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      setTypingGroup(groupId, false);
    }
    clearTimeout(typingTimeoutRef.current);
  };

  const onChangeText = (text) => {
    setInputText(text);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTypingGroup(groupId, true);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 2000);
  };

  const handleReportMessage = useCallback((message) => {
    setReportTarget({ type: 'message', id: message.id || message._id, name: message.sender?.name || groupName });
    setReportModalVisible(true);
  }, [groupName]);

  const renderMessage = useCallback(({ item }) => (
    <GroupMessageItem item={item} currentUserId={currentUserId} onReport={handleReportMessage} />
  ), [currentUserId, handleReportMessage]);

  const handleLoadOlderMessages = useCallback(() => {
    if (messages.length > 0) {
      fetchGroupMessages(groupId); // Group messages don't paginate for now
    }
  }, [messages, groupId]);

  const typingNames = Object.values(typingUsers);
  const typingLabel = typingNames.length > 0 ? `${typingNames.join(', ')} is typing…` : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={invertedMessages}
            inverted
            keyExtractor={(item, index) => item._id || item.clientId || `gmsg-${index}`}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={15}
            updateCellsBatchingPeriod={50}
          />

          {typingLabel && (
            <View style={styles.typingBar}>
              <Text style={styles.typingText}>{typingLabel}</Text>
            </View>
          )}

          <View style={styles.inputWrap}>
            <TouchableOpacity onPress={pickImage} style={styles.attachButton} disabled={uploadingImage}>
              <Ionicons name="image-outline" size={24} color={uploadingImage ? colors.textSoft : colors.secondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message…"
              placeholderTextColor={colors.textSoft}
              value={inputText}
              onChangeText={onChangeText}
              multiline
            />
            <TouchableOpacity onPress={handleSend} disabled={!inputText.trim()}>
              <View style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}>
                <Ionicons name="send" size={18} color={colors.white} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        targetType={reportTarget?.type}
        targetId={reportTarget?.id}
        targetName={reportTarget?.name ? `Message from ${reportTarget.name}` : groupName}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm, flexGrow: 1 },
  messageRow: { flexDirection: 'row', marginBottom: spacing.sm, alignItems: 'flex-end' },
  myMessageRow: { justifyContent: 'flex-end' },
  otherMessageRow: { justifyContent: 'flex-start' },
  senderAvatarWrap: { marginRight: spacing.sm, marginBottom: 2 },
  senderAvatar: { width: 32, height: 32, borderRadius: 16 },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.medium },
  myBubble: { backgroundColor: colors.primarySoft, borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  senderName: { fontWeight: '600', fontSize: 12, marginBottom: 4, color: colors.secondary },
  myMessageText: { color: colors.text, fontSize: 15 },
  otherMessageText: { color: colors.text, fontSize: 15 },
  groupMsgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  time: { fontSize: 10 },
  myTime: { color: colors.textMuted },
  otherTime: { color: colors.textSoft },
  reportGMsgBtn: { marginLeft: 6, padding: 2 },
  imageWrapper: { position: 'relative' },
  messageImage: { width: 220, height: 160, borderRadius: radii.small, marginBottom: 4, backgroundColor: colors.surfaceMuted },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay, borderRadius: radii.small, justifyContent: 'center', alignItems: 'center' },
  uploadingText: { color: colors.white, fontSize: 12, marginTop: 4 },
  typingBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, backgroundColor: colors.backgroundAlt },
  typingText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  inputWrap: { flexDirection: 'row', padding: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, alignItems: 'flex-end' },
  attachButton: { marginRight: spacing.sm, marginBottom: spacing.xs, justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, marginRight: spacing.sm, maxHeight: 100, fontSize: 15, color: colors.text, outlineStyle: 'none' },
  sendBtn: { backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 2, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
