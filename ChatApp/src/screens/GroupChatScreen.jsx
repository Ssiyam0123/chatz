import React, { useEffect, useRef } from 'react';
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
  Image,
  Alert,
  SafeAreaView,
} from 'react-native';
import useChatStore from '../stores/chatStore';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { colors, radii, spacing } from '../theme/blushDusk';
import Avatar from '../components/ui/Avatar';

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

export default function GroupChatScreen({ route }) {
  const { groupId, groupName } = route.params;
  const [inputText, setInputText] = React.useState('');
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
    fetchGroupMessages(groupId);
  }, [groupId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

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

  const renderMessage = ({ item }) => {
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
              <Image source={{ uri: item.image }} style={styles.messageImage} />
              {item.isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color={colors.white} />
                  <Text style={styles.uploadingText}>Sending…</Text>
                </View>
              )}
            </View>
          )}
          {item.text ? <Text style={isMe ? styles.myMessageText : styles.otherMessageText}>{item.text}</Text> : null}
          <Text style={[styles.time, isMe ? styles.myTime : styles.otherTime]}>
            {item.createdAt && typeof item.createdAt !== 'undefined' && !isNaN(new Date(item.createdAt).getTime()) 
              ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : item.isUploading ? 'Sending...' : ''}
          </Text>
        </View>
      </View>
    );
  };

  const typingNames = Object.values(typingUsers);
  const typingLabel = typingNames.length > 0 ? `${typingNames.join(', ')} is typing…` : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id || item.clientId}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
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
  time: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myTime: { color: colors.textMuted },
  otherTime: { color: colors.textSoft },
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
