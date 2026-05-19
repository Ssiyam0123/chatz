import React, { useEffect, useRef, useCallback } from 'react';
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
    const senderId = item.sender?._id || item.sender;
    const isMe = senderId === currentUserId || senderId?.toString() === currentUserId;

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        {!isMe && (
          <View style={styles.senderAvatarWrap}>
            {item.sender?.avatar ? (
              <Image source={{ uri: item.sender.avatar }} style={styles.senderAvatar} />
            ) : (
              <View style={[styles.senderAvatar, styles.senderAvatarPlaceholder]}>
                <Text style={styles.senderAvatarText}>{(item.sender?.name || 'U')[0].toUpperCase()}</Text>
              </View>
            )}
          </View>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          {!isMe && <Text style={styles.senderName}>{item.sender?.name || 'Unknown'}</Text>}
          {item.image && (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: item.image }} style={styles.messageImage} />
              {item.isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#fff" />
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.attachButton} disabled={uploadingImage}>
            <Ionicons name="add-circle-outline" size={28} color={uploadingImage ? '#ccc' : '#007AFF'} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message…"
            value={inputText}
            onChangeText={onChangeText}
            multiline
          />
          <TouchableOpacity onPress={handleSend} style={styles.sendButton} disabled={!inputText.trim()}>
            <Ionicons name="send" size={24} color={inputText.trim() ? '#007AFF' : '#ccc'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10 },
  messageRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  myMessageRow: { justifyContent: 'flex-end' },
  otherMessageRow: { justifyContent: 'flex-start' },
  senderAvatarWrap: { marginRight: 8, marginBottom: 2 },
  senderAvatar: { width: 32, height: 32, borderRadius: 16 },
  senderAvatarPlaceholder: { backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  senderAvatarText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  messageBubble: { maxWidth: '80%', padding: 10, borderRadius: 18 },
  myBubble: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#f0f0f0', borderBottomLeftRadius: 4 },
  senderName: { fontWeight: 'bold', fontSize: 12, marginBottom: 4, color: '#007AFF' },
  myMessageText: { color: '#fff', fontSize: 15 },
  otherMessageText: { color: '#333', fontSize: 15 },
  time: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myTime: { color: 'rgba(255,255,255,0.7)' },
  otherTime: { color: '#888' },
  imageWrapper: { position: 'relative' },
  messageImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 4 },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  uploadingText: { color: '#fff', fontSize: 12, marginTop: 4 },
  typingBar: { paddingHorizontal: 15, paddingVertical: 5, backgroundColor: '#f9f9f9' },
  typingText: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#eee', alignItems: 'flex-end' },
  attachButton: { marginRight: 8, marginBottom: 4 },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 15, paddingTop: 8, paddingBottom: 8, marginRight: 10, maxHeight: 100 },
  sendButton: { marginBottom: 4 },
});
