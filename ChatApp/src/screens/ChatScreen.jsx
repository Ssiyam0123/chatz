import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  Alert,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import useChatStore from '../stores/chatStore';

const EMPTY_ARRAY = [];

export default function ChatScreen({ route }) {
  const { userId: partnerId, userName } = route.params;
  const [inputText, setInputText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
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

  const isFriend = friends.some((f) => (f._id || f.id) === partnerId);
  const incomingRequest = friendRequests.find(
    (r) =>
      (r.sender?._id || r.sender) === partnerId &&
      (r.receiver?._id || r.receiver) === currentUserId
  );
  const outgoingRequest = friendRequests.find(
    (r) =>
      (r.sender?._id || r.sender) === currentUserId &&
      (r.receiver?._id || r.receiver) === partnerId
  );

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (isFriend) {
      fetchChatHistory(partnerId);
    }
  }, [partnerId, isFriend]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={{ marginRight: 15 }}>
            <Ionicons name="call-outline" size={24} color="#007bff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={{ marginRight: 15 }}>
            <Ionicons name="videocam-outline" size={24} color="#007bff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

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

  const renderMessage = ({ item }) => {
    const senderId = item.sender?._id || item.sender;
    const isMe = senderId === currentUserId || senderId?.toString() === currentUserId;

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          {item.image && (
            <View style={styles.imageWrapper}>
              <Image 
                source={{ uri: item.image }} 
                style={styles.messageImage} 
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
          <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>
            {item.createdAt && typeof item.createdAt !== 'undefined' && !isNaN(new Date(item.createdAt).getTime()) 
              ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : item.isUploading ? 'Sending...' : ''}
          </Text>
        </View>
      </View>
    );
  };

  const ChatContent = (
    <View style={styles.inner}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id || item.clientId || Math.random().toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          isFriend ? (
            <Text style={styles.emptyText}>Start a conversation with {userName}</Text>
          ) : (
            <View style={styles.lockedHistoryContainer}>
              <Ionicons name="shield-half" size={48} color="#ccc" style={{ marginBottom: 10 }} />
              <Text style={styles.lockedHistoryText}>Chat history is locked until you are friends.</Text>
            </View>
          )
        }
      />

      {isFriend ? (
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.attachButton} disabled={uploadingImage}>
              <Ionicons name="add-circle-outline" size={28} color={uploadingImage ? '#ccc' : '#007bff'} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message..."
              multiline
              blurOnSubmit={false}
              onSubmitEditing={isWeb ? handleSend : undefined}
            />
            <TouchableOpacity onPress={handleSend} disabled={!inputText.trim()}>
              <View style={[styles.sendButton, !inputText.trim() && styles.disabledButton]}>
                <Text style={styles.sendText}>Send</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.lockBanner}>
          <Ionicons name="lock-closed" size={24} color="#f0ad4e" />
          <Text style={styles.lockText}>
            You can only message users who are in your friends list.
          </Text>
          
          {incomingRequest && (
            <TouchableOpacity
              style={[styles.bannerBtn, styles.acceptBannerBtn]}
              onPress={() => respondFriendRequest(incomingRequest._id, 'accepted')}
            >
              <Text style={styles.bannerBtnText}>Accept Friend Request</Text>
            </TouchableOpacity>
          )}

          {outgoingRequest && (
            <View style={[styles.bannerBtn, styles.pendingBannerBtn]}>
              <Text style={[styles.bannerBtnText, { color: '#888' }]}>Request Sent (Pending)</Text>
            </View>
          )}

          {!incomingRequest && !outgoingRequest && (
            <TouchableOpacity
              style={[styles.bannerBtn, styles.addBannerBtn]}
              onPress={() => sendFriendRequest(partnerId)}
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={headerHeight + 10}
          >
            {ChatContent}
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  inner: { flex: 1 },
  messagesList: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 10 },
  messageRow: { marginBottom: 10, flexDirection: 'row' },
  myMessageRow: { justifyContent: 'flex-end' },
  theirMessageRow: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: { backgroundColor: '#007bff', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#f1f1f1', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 22 },
  myMessageText: { color: '#fff' },
  theirMessageText: { color: '#222' },
  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myTime: { color: 'rgba(255,255,255,0.7)' },
  theirTime: { color: '#999' },
  imageWrapper: { position: 'relative' },
  messageImage: { width: 220, height: 165, borderRadius: 12, marginBottom: 4, backgroundColor: '#eee' },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  uploadingText: { color: '#fff', fontSize: 12, marginTop: 4 },
  inputWrapper: { padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#f8f8f8', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: '#eee' },
  input: { flex: 1, maxHeight: 100, fontSize: 16, color: '#333', paddingTop: 8, paddingBottom: 8, outlineStyle: 'none' },
  sendButton: { marginLeft: 10, backgroundColor: '#007bff', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, marginBottom: 2 },
  disabledButton: { backgroundColor: '#b0d4ff' },
  sendText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { color: '#aaa', fontStyle: 'italic', textAlign: 'center', marginTop: 50 },
  attachButton: { marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10, alignItems: 'center', width: '80%' },
  modalText: { fontSize: 18, marginBottom: 20, textAlign: 'center' },
  modalButton: { backgroundColor: '#007bff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 },
  modalButtonText: { color: '#fff', fontSize: 16 },
  
  // Friend System Locks
  lockedHistoryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 30,
  },
  lockedHistoryText: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  lockBanner: {
    padding: 20,
    backgroundColor: '#fffbeb',
    borderTopWidth: 1,
    borderTopColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 20,
  },
  bannerBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addBannerBtn: {
    backgroundColor: '#007bff',
  },
  acceptBannerBtn: {
    backgroundColor: '#28a745',
  },
  pendingBannerBtn: {
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  bannerBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});